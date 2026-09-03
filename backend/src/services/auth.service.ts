import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '../database/prisma.js';
import { AppError, notFound } from '../types/errors.js';
import { z } from 'zod';

const SALT_LENGTH = 16;
const HASH_ITERATIONS = 100000;
const HASH_KEY_LENGTH = 64;
const HASH_ALGO = 'sha512';

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || randomBytes(SALT_LENGTH).toString('hex');
  const derived = pbkdf2Sync(password, useSalt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_ALGO).toString('hex');
  return { hash: derived, salt: useSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(6),
  role: z.enum(['USER', 'ORACLE', 'INSURER', 'ADMIN']).default('USER'),
  language: z.string().default('en'),
});

export const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

export async function register(input: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existing) {
    throw new AppError('USER_EXISTS', 'A user with this phone number already exists', 409);
  }

  const { hash, salt } = hashPassword(input.password);
  const passwordHash = `${salt}:${hash}`;

  const user = await prisma.user.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      passwordHash,
      role: input.role as any,
      language: input.language,
    },
  });

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
  };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid phone or password', 401);
  }

  if (!user.passwordHash) {
    throw new AppError('PASSWORD_REQUIRED', 'This account has no password set', 400);
  }

  const [salt, storedHash] = user.passwordHash.split(':');
  const valid = verifyPassword(input.password, storedHash, salt);

  if (!valid) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid phone or password', 401);
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
  };
}

export function generateToken(user: { id: string; role: string }, jwtSign: Function): string {
  return jwtSign({ userId: user.id, role: user.role }, { expiresIn: '24h' });
}

export async function getUserWithPassword(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound('user', id);
  return user;
}
