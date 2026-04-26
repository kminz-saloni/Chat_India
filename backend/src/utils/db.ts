import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat_india';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');
}
