import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createSession, SESSION_COOKIE, verifyPassword } from '@/lib/security/auth';
import { rateLimit } from '@/lib/security/rateLimit';
import { fail, ok } from '@/lib/api';
import { HttpError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    // Throttle by email so a shared IP cannot be brute-forced silently.
    rateLimit(`login:${body.email.toLowerCase()}`, 8);

    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });

    // One message for every failure mode: never reveal whether an account exists.
    const invalid = new HttpError(401, 'Email o password non corretti.');
    if (!user?.passwordHash) throw invalid;
    if (!verifyPassword(body.password, user.passwordHash)) throw invalid;

    const token = await createSession(user.id);
    const response = ok({ email: user.email });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    logger.info('User signed in', { userId: user.id });
    return response;
  } catch (error) {
    return fail(error);
  }
}
