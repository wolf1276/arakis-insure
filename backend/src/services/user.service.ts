import { prisma } from '../database/prisma.js';
import { AppError, notFound } from '../types/errors.js';
import { z } from 'zod';

export const createUserSchema = z.object({
  externalId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(1),
  language: z.string().default('en'),
});

export const createNomineeSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  relationship: z.string().min(1),
});

export async function createUser(input: z.infer<typeof createUserSchema>) {
  return prisma.user.create({ data: input });
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound('user', id);
  return user;
}

export async function addNominee(userId: string, input: z.infer<typeof createNomineeSchema>) {
  await getUser(userId);
  return prisma.nominee.create({
    data: { userId, ...input },
  });
}

export async function getUserNominees(userId: string) {
  await getUser(userId);
  return prisma.nominee.findMany({ where: { userId } });
}

export async function getUserPolicies(userId: string) {
  await getUser(userId);
  return prisma.policy.findMany({
    where: { userId },
    include: { nominee: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUserClaims(userId: string) {
  await getUser(userId);
  return prisma.claim.findMany({
    where: { policy: { userId } },
    include: { policy: true },
    orderBy: { createdAt: 'desc' },
  });
}
