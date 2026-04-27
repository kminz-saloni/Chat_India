import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '@/models/User';
import { OtpRequest } from '@/models/OtpRequest';
import { Session } from '@/models/Session';
import { generateOtp, hashOtp, hashIp, parseUserAgent } from '@/utils/authHelpers';
import { generateToken, AuthRequest } from '@/middleware/auth';
import { io } from '@/index';
import { disconnectSessionSockets } from '@/socket/handlers';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;

// ─── POST /auth/request-otp ───────────────────────────────────────────────────
export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ message: 'Phone number is required' });
    return;
  }

  // Rate-limit: delete any existing OTP for this phone
  await OtpRequest.deleteMany({ phone });

  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await OtpRequest.create({ phone, codeHash, expiresAt, attempts: 0 });

  // TODO: Integrate real SMS provider (Twilio, MSG91, etc.)
  // For development, return OTP in response
  console.log(`[DEV] OTP for ${phone}: ${otp}`);

  res.json({
    message: 'OTP sent successfully',
    // Remove this in production:
    ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
  });
}

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────
export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, code } = req.body;
  if (!phone || !code) {
    res.status(400).json({ message: 'Phone and OTP code are required' });
    return;
  }

  const otpRecord = await OtpRequest.findOne({ phone });
  if (!otpRecord) {
    res.status(400).json({ message: 'No OTP request found. Please request a new OTP.' });
    return;
  }

  if (otpRecord.expiresAt < new Date()) {
    await OtpRequest.deleteOne({ phone });
    res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    return;
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await OtpRequest.deleteOne({ phone });
    res.status(429).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    return;
  }

  const codeHash = hashOtp(code);
  if (codeHash !== otpRecord.codeHash) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    res.status(400).json({ message: 'Invalid OTP', attemptsLeft: MAX_OTP_ATTEMPTS - otpRecord.attempts });
    return;
  }

  // OTP verified — mark it as used
  await OtpRequest.deleteOne({ phone });

  // Check if user exists
  const existingUser = await User.findOne({ phone, deletedAt: null });

  res.json({
    message: 'OTP verified',
    isNewUser: !existingUser,
  });
}

// ─── POST /auth/register ──────────────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  const { phone, name, password, publicKey, encryptedPrivateKey } = req.body;
  if (!phone || !name || !password) {
    res.status(400).json({ message: 'Phone, name, and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ message: 'Password must be at least 8 characters' });
    return;
  }
  if (!publicKey || !encryptedPrivateKey) {
    res.status(400).json({ message: 'publicKey and encryptedPrivateKey are required' });
    return;
  }

  const existing = await User.findOne({ phone });
  if (existing && !existing.deletedAt) {
    res.status(409).json({ message: 'User already registered with this phone number' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ phone, name, passwordHash, publicKey, encryptedPrivateKey });

  const ip = req.ip || '';
  const ua = req.headers['user-agent'] || '';
  const { browser, deviceName } = parseUserAgent(ua);
  const ipHash = hashIp(ip);

  const session = await Session.create({
    userId: user._id,
    deviceName,
    browser,
    ipHash,
    lastActive: new Date(),
    active: true,
    trusted: true, // first session is trusted
  });

  const token = generateToken(String(user._id), String(session._id));

  res.status(201).json({
    message: 'Registration successful',
    token,
    user: { id: user._id, name: user.name, phone: user.phone },
  });
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const { phone, password } = req.body;
  if (!phone || !password) {
    res.status(400).json({ message: 'Phone and password are required' });
    return;
  }

  const user = await User.findOne({ phone, deletedAt: null });
  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  if (user.panicLocked) {
    res.status(403).json({ message: 'This account is currently locked. Contact support to unlock.' });
    return;
  }

  const ip = req.ip || '';
  const ua = req.headers['user-agent'] || '';
  const { browser, deviceName } = parseUserAgent(ua);
  const ipHash = hashIp(ip);

  const session = await Session.create({
    userId: user._id,
    deviceName,
    browser,
    ipHash,
    lastActive: new Date(),
    active: true,
    trusted: false,
  });

  const token = generateToken(String(user._id), String(session._id));

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      publicKey: user.publicKey,
      encryptedPrivateKey: user.encryptedPrivateKey,
    },
  });
}

// ─── POST /auth/panic-unlock ──────────────────────────────────────────────────
export async function panicUnlock(req: Request, res: Response): Promise<void> {
  const { phone, password } = req.body;
  if (!phone || !password) {
    res.status(400).json({ message: 'Phone and password are required' });
    return;
  }

  const user = await User.findOne({ phone, deletedAt: null });
  if (!user) {
    res.status(401).json({ message: 'Invalid credentials: User not found' });
    return;
  }

  if (!user.panicLocked) {
    res.status(400).json({ message: 'Account is not currently locked' });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ message: 'Invalid credentials: Password incorrect' });
    return;
  }

  // Unlock the account
  user.panicLocked = false;
  await user.save();

  // Create a new session and log the user in
  const ip = req.ip || '';
  const ua = req.headers['user-agent'] || '';
  const { browser, deviceName } = parseUserAgent(ua);
  const ipHash = hashIp(ip);

  const session = await Session.create({
    userId: user._id,
    deviceName,
    browser,
    ipHash,
    lastActive: new Date(),
    active: true,
    trusted: true, // We can consider an unlocked session trusted
  });

  const token = generateToken(String(user._id), String(session._id));

  res.json({
    message: 'Account successfully unlocked and logged in',
    token,
    user: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      publicKey: user.publicKey,
      encryptedPrivateKey: user.encryptedPrivateKey,
    },
  });
}

// ─── POST /auth/logout ────────────────────────────────────────────────────────
export async function logout(req: AuthRequest, res: Response): Promise<void> {
  await Session.findByIdAndUpdate(req.sessionId, { active: false });
  res.json({ message: 'Logged out successfully' });
}

// ─── GET /auth/sessions ───────────────────────────────────────────────────────
export async function getSessions(req: AuthRequest, res: Response): Promise<void> {
  const sessions = await Session.find({ userId: req.userId, active: true }).sort({ lastActive: -1 });
  const mappedSessions = sessions.map((session) => ({
    ...session.toObject(),
    current: String(session._id) === req.sessionId,
  }));
  res.json({ sessions: mappedSessions });
}

// ─── DELETE /auth/sessions/:sessionId ────────────────────────────────────────
export async function revokeSession(req: AuthRequest, res: Response): Promise<void> {
  const rawSessionId = req.params.sessionId;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  if (!sessionId) {
    res.status(400).json({ message: 'sessionId is required' });
    return;
  }

  const session = await Session.findOne({ _id: sessionId, userId: req.userId });
  if (!session) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }

  if (!session.active) {
    res.json({ message: 'Session already revoked' });
    return;
  }

  await Session.findByIdAndUpdate(sessionId, { active: false });
  disconnectSessionSockets(io, sessionId);
  res.json({ message: 'Session revoked' });
}

// ─── DELETE /auth/sessions ────────────────────────────────────────────────────
export async function revokeAllOtherSessions(req: AuthRequest, res: Response): Promise<void> {
  const sessionsToRevoke = await Session.find({
    userId: req.userId,
    active: true,
    _id: { $ne: req.sessionId },
  }).select('_id');

  if (sessionsToRevoke.length > 0) {
    await Session.updateMany(
      { _id: { $in: sessionsToRevoke.map((s) => s._id) } },
      { active: false },
    );

    sessionsToRevoke.forEach((session) => {
      disconnectSessionSockets(io, String(session._id));
    });
  }

  res.json({ message: 'All other sessions revoked' });
}

// ─── DELETE /auth/account ─────────────────────────────────────────────────────
export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  const { password } = req.body;
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ message: 'Incorrect password' });
    return;
  }

  user.deletedAt = new Date();
  await user.save();
  await Session.updateMany({ userId: req.userId }, { active: false });

  res.json({ message: 'Account deleted successfully' });
}

// ─── PATCH /auth/keys ─────────────────────────────────────────────────────────
// Called after Phase 3 key generation to upload public key + encrypted private key
export async function uploadKeys(req: AuthRequest, res: Response): Promise<void> {
  const { publicKey, encryptedPrivateKey } = req.body;
  if (!publicKey || !encryptedPrivateKey) {
    res.status(400).json({ message: 'publicKey and encryptedPrivateKey are required' });
    return;
  }
  await User.findByIdAndUpdate(req.userId, { publicKey, encryptedPrivateKey });
  res.json({ message: 'Keys uploaded successfully' });
}
