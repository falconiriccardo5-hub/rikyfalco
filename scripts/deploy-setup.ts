import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/security/auth';

/**
 * Idempotent production bootstrap, run as part of the build.
 *
 * Applies pending migrations and makes sure the deployment has a workspace, a
 * brand profile and one account that can actually sign in. Without this a fresh
 * deploy would come up with an empty database and no way into the UI.
 *
 * It never fails the build when there is no database configured (preview builds
 * without env), and it never prints a secret.
 */
const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('[setup] DATABASE_URL not set — skipping migrations and seeding.');
    return;
  }

  console.log('[setup] applying migrations…');
  execSync('prisma migrate deploy', { stdio: 'inherit' });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'riccardo-fitness' },
    create: { name: 'Riccardo Fitness', slug: 'riccardo-fitness' },
    update: {},
  });

  const existingBrand = await prisma.brandProfile.findFirst({
    where: { workspaceId: workspace.id, brandName: 'Riccardo Fitness' },
  });

  const brand = {
    workspaceId: workspace.id,
    brandName: 'Riccardo Fitness',
    niche: 'Ricomposizione corporea, forza, postura e allenamento personalizzato',
    primaryAudience: 'Donne 30-50 anni',
    secondaryAudience: 'Uomini 25-40 anni',
    positioning:
      'Personal trainer specializzato in ricomposizione corporea, forza, postura e allenamento personalizzato',
    tone: 'Premium, educational, professional, mai estremista',
    visualStyle: 'Cinematic, premium, luce naturale morbida, palette calda e sobria',
    colors: ['#0E1119', '#4C8DFF', '#F2F5FC'],
    fonts: ['Inter'],
    forbiddenStyles: ['extremism', 'body shaming', 'claims medici', 'neon gym-bro aesthetic'],
    ctaOptions: ['Scrivimi in DM', 'Scrivimi su WhatsApp', 'Commenta la keyword'],
    keywords: ['ricomposizione corporea', 'forza', 'postura', 'allenamento personalizzato'],
    preferredDuration: 20,
    preferredFormats: ['instagram_reel_9:16'],
    isDefault: true,
  };

  if (existingBrand) {
    await prisma.brandProfile.update({ where: { id: existingBrand.id }, data: brand });
  } else {
    await prisma.brandProfile.create({ data: brand });
  }

  const email = (process.env.ADMIN_EMAIL ?? 'owner@riccardo.fitness').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Riccardo',
      role: 'owner',
      workspaceId: workspace.id,
      passwordHash: password ? hashPassword(password) : null,
    },
    // Rotating ADMIN_PASSWORD on a redeploy updates the login; leaving it unset
    // keeps whatever password is already stored.
    update: password ? { passwordHash: hashPassword(password) } : {},
  });

  console.log(`[setup] workspace and brand ready; account ${user.email} present.`);
  if (!password && !user.passwordHash) {
    console.warn(
      '[setup] WARNING: no ADMIN_PASSWORD set and the account has no password — nobody can sign in.',
    );
  }
}

main()
  .catch((error) => {
    console.error('[setup] failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
