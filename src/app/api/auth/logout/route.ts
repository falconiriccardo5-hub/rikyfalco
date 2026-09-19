import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE, sessionTokenHash } from '@/lib/security/auth';

export const dynamic = 'force-dynamic';

/** Posted from a plain form, so it answers with a redirect rather than JSON. */
export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    // Drop the session server-side too: clearing the cookie alone leaves it valid.
    await prisma.session
      .deleteMany({ where: { token: sessionTokenHash(token) } })
      .catch(() => undefined);
  }

  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
