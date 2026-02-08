# Directive: Auth Flow (PIN Authentication)

## Goal
Understand how PIN-based authentication works in Second Brain

## When to Use
- Implementing new protected routes
- Debugging authentication issues
- Understanding session management
- Updating PIN or session secret
- Adding user management features (future)

## Prerequisites
- Access to `vault/config.json`
- Understanding of HMAC signatures
- Familiarity with Next.js middleware and cookies

## Steps

### Architecture Overview

**Auth Flow**:
```
User visits protected route
    ↓
Middleware checks for `sb-session` cookie
    ↓
Cookie exists? → Verify HMAC signature
    ↓
Valid? → Allow access
Invalid/Missing? → Redirect to /login
    ↓
Login page: User enters PIN
    ↓
POST /api/auth { pin: "3437" }
    ↓
Server validates PIN against vault/config.json
    ↓
Valid? → Generate signed session token → Set cookie → Redirect to dashboard
Invalid? → Show error
```

**Key Components**:
- `vault/config.json` — PIN and session secret storage
- `src/app/api/auth/route.ts` — Auth API endpoints
- `src/middleware.ts` — Route protection (future)
- `sb-session` cookie — HMAC-signed session token

### Configuration (vault/config.json)

**Structure**:
```json
{
  "auth": {
    "pin": "3437",
    "sessionSecret": "random-secret-string-here"
  },
  "profile": {
    "name": "Samson"
  }
}
```

**Fields**:
- `auth.pin` — 4-digit PIN for login (currently `3437`)
- `auth.sessionSecret` — Secret key for HMAC signing (auto-generated)
- `profile.name` — User display name

**Generating a New Session Secret**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Login Flow (POST /api/auth)

**Request**:
```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"pin": "3437"}'
```

**Response (Success)**:
```json
{
  "authenticated": true,
  "user": "Samson"
}
```

**Cookie Set**:
```
Set-Cookie: sb-session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

**Response (Failure)**:
```json
{
  "error": "Invalid PIN"
}
```

**HTTP Status**: 401

### Session Token Format

**Structure**:
```
base64url(payload).base64url(hmac-sha256-signature)
```

**Payload**:
```json
{
  "user": "Samson",
  "iat": 1707350400000,
  "exp": 1708560000000
}
```

- `user` — Username from config
- `iat` — Issued at timestamp (ms)
- `exp` — Expiry timestamp (ms) — 7 days from `iat`

**Example Token**:
```
eyJ1c2VyIjoiU2Ftc29uIiwiaWF0IjoxNzA3MzUwNDAwMDAwLCJleHAiOjE3MDg1NjAwMDAwMDB9.a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

### Token Signing (HMAC-SHA256)

**Algorithm**:
```typescript
import crypto from 'crypto';

function signToken(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}
```

**Verification**:
```typescript
function verifyToken(token: string, secret: string): object | null {
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  
  const expected = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  
  if (sig !== expected) return null;  // Signature mismatch
  
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    
    // Check expiry
    if (payload.exp && Date.now() > payload.exp) return null;
    
    return payload;
  } catch {
    return null;
  }
}
```

### Session Validation (GET /api/auth)

**Request**:
```bash
curl http://localhost:3000/api/auth \
  -H "Cookie: sb-session=<token>"
```

**Response (Valid)**:
```json
{
  "authenticated": true,
  "user": "Samson"
}
```

**Response (Invalid/Expired)**:
```json
{
  "authenticated": false
}
```

**HTTP Status**: 401

### Logout (DELETE /api/auth)

**Request**:
```bash
curl -X DELETE http://localhost:3000/api/auth
```

**Response**:
```json
{
  "authenticated": false
}
```

**Cookie Cleared**:
```
Set-Cookie: sb-session=; Max-Age=0
```

### Protecting Routes with Middleware

**Future Implementation** (`src/middleware.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-session')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Verify token (same logic as GET /api/auth)
  const payload = verifyToken(token, sessionSecret);
  
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**Protected Routes**:
- `/` (dashboard)
- `/agents`
- `/tasks`
- `/ask`
- `/chat`
- `/settings`
- All others except `/login` and `/api/auth`

### Client-Side Auth Check

**React Hook** (future):
```typescript
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    fetch('/api/auth')
      .then(res => res.json())
      .then(data => {
        setAuthenticated(data.authenticated);
        if (!data.authenticated) {
          router.push('/login');
        }
      })
      .finally(() => setLoading(false));
  }, []);
  
  return { authenticated, loading };
}
```

**Usage**:
```typescript
// In any protected page
export default function DashboardPage() {
  const { authenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!authenticated) return null;  // Will redirect
  
  return <Dashboard />;
}
```

### Changing the PIN

**Manual Update**:
```bash
cd vault
nano config.json

# Update:
{
  "auth": {
    "pin": "9999",  # New PIN
    "sessionSecret": "..."
  }
}
```

**Via API** (future endpoint):
```bash
curl -X PATCH http://localhost:3000/api/auth/pin \
  -H "Content-Type: application/json" \
  -d '{
    "currentPin": "3437",
    "newPin": "9999"
  }'
```

**Best Practices**:
- Use 4-6 digit PIN
- Don't reuse PINs
- Rotate sessionSecret when changing PIN
- Invalidate all existing sessions (delete cookie on all devices)

### Rotating the Session Secret

**Why Rotate?**
- Invalidate all existing sessions
- Security breach mitigation
- Periodic security hygiene

**Steps**:
```bash
# 1. Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > new_secret.txt

# 2. Update config
cd vault
nano config.json

# Paste new secret into auth.sessionSecret

# 3. All users must re-login (old tokens are now invalid)
```

## Expected Output

### Successful Login
```
Browser:
1. User visits /login
2. Enters PIN: 3437
3. Submits form
4. Redirected to /
5. Dashboard loads

Cookie:
sb-session=eyJ1c2VyIjoiU2Ftc29uIiwiaWF0IjoxNzA3MzUwNDAwMDAwLCJleHAiOjE3MDg1NjAwMDAwMDB9.a3b2...
HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```

### Failed Login
```
Browser:
1. User enters PIN: 1234
2. Submits form
3. Error message: "Invalid PIN"
4. Stays on /login

Response:
{
  "error": "Invalid PIN"
}
Status: 401
```

### Session Expired
```
Browser:
1. User visits / after 7 days
2. Middleware checks cookie
3. Token expired
4. Redirected to /login

OR:

API Response:
{
  "authenticated": false
}
Status: 401
```

## Edge Cases

### Missing config.json
**Problem**: App can't start without config

**Error**:
```
Error: ENOENT: no such file or directory, open 'vault/config.json'
```

**Solution**: Create default config
```bash
cd vault
cat > config.json << EOF
{
  "auth": {
    "pin": "3437",
    "sessionSecret": "$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  },
  "profile": {
    "name": "User"
  }
}
EOF
```

### Invalid JSON in config.json
**Problem**: Malformed JSON breaks auth

**Error**:
```
SyntaxError: Unexpected token } in JSON at position 42
```

**Solution**: Validate JSON
```bash
cat vault/config.json | python3 -m json.tool
```

### Token Tampering
**Problem**: User modifies cookie payload

**Example**:
```
Original: eyJ1c2VyIjoiU2Ftc29uIn0.abc123
Tampered: eyJ1c2VyIjoiQWRtaW4ifQ.abc123
```

**Behavior**: Signature verification fails → Invalid token → Redirect to login

**Protection**: HMAC signature ensures integrity

### Session Expiry Not Honored
**Problem**: User stays logged in past 7 days

**Cause**: Expiry check not implemented

**Fix** (in verifyToken):
```typescript
if (payload.exp && Date.now() > payload.exp) return null;
```

### Cookie Not Set (Secure Flag in Dev)
**Problem**: Browser rejects cookie because Secure flag requires HTTPS

**Solution**: Conditional Secure flag
```typescript
response.cookies.set('sb-session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // Only HTTPS in prod
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_MAX_AGE,
});
```

### Multiple Users (Future)
**Current**: Single-user system (one PIN)

**Future**: Add users table
```json
{
  "users": [
    { "id": "user-1", "name": "Samson", "pin": "3437", "role": "admin" },
    { "id": "user-2", "name": "Guest", "pin": "9999", "role": "viewer" }
  ]
}
```

Then validate: `users.find(u => u.pin === pin)`

### Cross-Site Request Forgery (CSRF)
**Risk**: Attacker tricks user into making authenticated request

**Mitigation**: SameSite=Lax cookie prevents CSRF on cross-site requests

**Future**: Add CSRF token for state-changing operations

## Cost
- **Auth Flow**: Free (no external services)
- **Session Storage**: Cookie-based (no database needed)
- **Crypto Operations**: <1ms per request (negligible)

---

**Related Directives**:
- `local-dev-setup.md` — Initial config setup
- `deploy-vercel.md` — Environment variables for production
