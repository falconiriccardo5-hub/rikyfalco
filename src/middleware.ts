import { NextResponse, type NextRequest } from 'next/server';

/**
 * Gate the app behind a session cookie when a login is required.
 *
 * This is a cheap edge check on cookie PRESENCE only — the cookie's validity is
 * verified against the database in `currentUser()`, because the middleware
 * runtime has no database access. It exists so an unauthenticated visitor lands
 * on /login instead of on an error, not as the authorization boundary.
 */
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/health'];

export function middleware(request: NextRequest) {
  const authRequired =
    process.env.NODE_ENV === 'production' || process.env.AUTH_REQUIRED === 'true';
  if (!authRequired) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  if (request.cookies.get('rico_session')?.value) return NextResponse.next();

  // API callers get a status they can act on; browsers get the login page.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: { code: 'HTTP_ERROR', message: 'Authentication required.' } },
      { status: 401 },
    );
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own assets and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
