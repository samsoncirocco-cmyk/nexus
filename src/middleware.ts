import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'sb-session';

// Public paths that don't require auth
const PUBLIC_PATHS = ['/login', '/api/auth', '/api/datalake', '/api/revalidate', '/api/activity', '/api/ask'];

// Static asset patterns to skip
const STATIC_PATTERNS = [
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/manifest\.json$/,
  /^\/icons\//,
  /^\/sw\.js$/,
  /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot)$/,
];

async function verifySession(token: string, secret: string): Promise<boolean> {
  const [data, sig] = token.split('.');
  if (!data || !sig) return false;

  // Use Web Crypto API (available in Edge Runtime / middleware)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));

  // Convert to base64url
  const expected = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  if (sig !== expected) return false;

  // Check expiry
  try {
    const payload = JSON.parse(atob(data.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (STATIC_PATTERNS.some((p) => p.test(pathname))) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify the session token
  // The secret is read from env or falls back to the default
  const secret = process.env.SESSION_SECRET || 'brain-session-secret-2026';
  const valid = await verifySession(token, secret);

  if (!valid) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear invalid cookie
    response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest.json, icons
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons/).*)',
  ],
};
