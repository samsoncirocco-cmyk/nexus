import { auth } from "./route"
import { NextResponse } from "next/server"

// Use `auth` wrapper to easily access session in middleware
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard');
  const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');

  // 1. Redirect authenticated users away from auth pages (login/register)
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // 2. Protect dashboard routes -> Redirect unauthenticated to login
  if (isDashboardRoute && !isLoggedIn) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  return NextResponse.next();
})

// Configure matcher for middleware
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
