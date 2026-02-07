import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

const VAULT_CONFIG = join(process.cwd(), 'vault', 'config.json');
const COOKIE_NAME = 'sb-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getConfig() {
  const raw = readFileSync(VAULT_CONFIG, 'utf-8');
  return JSON.parse(raw);
}

function signToken(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string, secret: string): object | null {
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    // Check expiry
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// GET /api/auth — check session validity
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const config = getConfig();
  const payload = verifyToken(token, config.auth.sessionSecret);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user: (payload as { user?: string }).user });
}

// POST /api/auth — authenticate with PIN
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 });
    }

    const config = getConfig();

    if (String(pin) !== String(config.auth.pin)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Create session token
    const payload = {
      user: config.profile.name,
      iat: Date.now(),
      exp: Date.now() + SESSION_MAX_AGE * 1000,
    };

    const token = signToken(payload, config.auth.sessionSecret);

    const response = NextResponse.json({
      authenticated: true,
      user: config.profile.name,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE /api/auth — logout (clear session)
export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });

  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
