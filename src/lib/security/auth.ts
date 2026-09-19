import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '../db';
import { HttpError } from '../errors';

export const SESSION_COOKIE = 'rico_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, digest] = stored.split(':');
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Sessions are stored hashed: a leaked database row cannot be replayed as a cookie. */
export function sessionTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const tokenHash = sessionTokenHash;

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await prisma.session.create({
    data: {
      userId,
      token: tokenHash(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export interface AuthedUser {
  id: string;
  email: string;
  workspaceId: string;
  role: string;
}

/** Resolve the caller from the session cookie, or null when unauthenticated. */
export async function currentUser(): Promise<AuthedUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: tokenHash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };
}

/**
 * Authentication gate for API routes. In development a single-user fallback
 * keeps the app usable before auth is wired up; it is refused in production.
 */
export async function requireUser(): Promise<AuthedUser> {
  const user = await currentUser();
  if (user) return user;

  // The single-user fallback exists only for local development, and only while
  // no password has been set. In production, or once an account has a
  // password, a real session is required.
  if (process.env.NODE_ENV === 'production' || process.env.AUTH_REQUIRED === 'true') {
    throw new HttpError(401, 'Authentication required.');
  }

  const fallback = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!fallback) throw new HttpError(401, 'No user exists yet. Run `npm run db:seed`.');
  if (fallback.passwordHash) {
    throw new HttpError(401, 'Authentication required: sign in at /login.');
  }
  return {
    id: fallback.id,
    email: fallback.email,
    workspaceId: fallback.workspaceId,
    role: fallback.role,
  };
}

/** True when this deployment demands a real login (production, or opted in). */
export function authRequired(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.AUTH_REQUIRED === 'true';
}

/** Authorization: a resource is only reachable from its own workspace. */
export function assertWorkspace(user: AuthedUser, workspaceId: string): void {
  if (user.workspaceId !== workspaceId) throw new HttpError(404, 'Not found.');
}
