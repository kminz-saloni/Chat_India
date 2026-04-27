# SECURITY_CHECKLIST.md

## Authentication Security

* Rate limit OTP requests.
* Expire OTP quickly (2-5 min).
* Hash OTP before storing.
* Limit OTP attempts.
* Use secure JWT expiry.
* Revoke token on logout.

## Password Security

* Hash passwords using Argon2 or bcrypt.
* Enforce minimum password strength.
* Never log passwords.
* Never store plaintext passwords.

## Encryption Security

* Generate keys client-side.
* Never send plaintext messages to server.
* Store only ciphertext.
* Encrypt private key backup.
* Clear keys from memory on logout when possible.

## API Security

* Validate all inputs.
* Sanitize query params.
* Use HTTPS only.
* Enable CORS only for frontend domain.
* Add request size limits.
* Add helmet/security headers.

## Database Security

* Use least-privilege DB credentials.
* Backup database.
* Add indexes to prevent abuse queries.
* Soft logs, never sensitive logs.

## Realtime Security

* Authenticate socket connection.
* Join only authorized rooms.
* Validate all socket events.
* Disconnect invalid sessions.

## Panic Lock Security

* Trusted device verification required.
* Secret code should be configurable.
* Store panic phrase as hash only (never plaintext).
* Validate phrase match server-side before panic lock.
* Audit trigger events.
* Force revoke all sessions.

## Frontend Security

* Protect routes.
* Escape unsafe content.
* Avoid dangerous HTML rendering.
* Store tokens securely.
* Prevent leaking secrets in client env.

## Operational Security

* Use separate dev/prod env keys.
* Rotate secrets regularly.
* Monitor errors.
* Keep dependencies updated.
* Remove debug logs before release.

## Before Demo / Release Final Check

* No plaintext messages in DB.
* OTP flow works.
* Unauthorized APIs blocked.
* Panic lock works.
* Vault works.
* Account deletion works.
* No exposed secrets in repo.
