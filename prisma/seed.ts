import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/security/auth';

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'riccardo-fitness' },
    create: { name: 'Riccardo Fitness', slug: 'riccardo-fitness' },
    update: {},
  });

  const email = process.env.SEED_USER_EMAIL ?? 'owner@riccardo.fitness';
  const password = process.env.SEED_USER_PASSWORD;

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Riccardo',
      workspaceId: workspace.id,
      role: 'owner',
      // No default password: set SEED_USER_PASSWORD to create a usable login.
      passwordHash: password ? hashPassword(password) : null,
    },
    update: {},
  });

  const existing = await prisma.brandProfile.findFirst({
    where: { workspaceId: workspace.id, brandName: 'Riccardo Fitness' },
  });

  const brandData = {
    workspaceId: workspace.id,
    brandName: 'Riccardo Fitness',
    niche: 'Ricomposizione corporea, forza, postura e allenamento personalizzato',
    primaryAudience: 'Donne 30-50 anni',
    secondaryAudience: 'Uomini 25-40 anni',
    positioning:
      'Personal trainer specializzato in ricomposizione corporea, forza, postura e allenamento personalizzato',
    tone: 'Premium, educational, professional, mai estremista',
    visualStyle: 'Cinematic, premium, luce naturale morbida, palette calda e sobria',
    colors: ['#0E0F14', '#C8A96A', '#F5F2EC'],
    fonts: ['Inter', 'Playfair Display'],
    forbiddenStyles: [
      'extremism',
      'body shaming',
      'before/after shock content',
      'neon gym-bro aesthetic',
      'claims medici',
    ],
    ctaOptions: ['Scrivimi in DM', 'Scrivimi su WhatsApp', 'Commenta la keyword'],
    keywords: [
      'ricomposizione corporea',
      'forza',
      'postura',
      'allenamento personalizzato',
      'massa magra',
    ],
    preferredDuration: 20,
    preferredFormats: ['instagram_reel_9:16'],
    isDefault: true,
  };

  if (existing) {
    await prisma.brandProfile.update({ where: { id: existing.id }, data: brandData });
  } else {
    await prisma.brandProfile.create({ data: brandData });
  }

  console.log(`Seeded workspace "${workspace.name}" with the Riccardo Fitness brand profile.`);
  if (!password) {
    console.log('No SEED_USER_PASSWORD set — the seeded user has no password yet.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
