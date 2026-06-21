/**
 * Cryptographic utility functions for token and ID generation.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';

/**
 * Generates a cryptographically secure random hex string.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generates a URL-safe random ID with a prefix.
 * Example: alert_a1b2c3d4e5f6...
 */
export function generateId(prefix: string): string {
  const randomPart = crypto.randomBytes(12).toString('hex');
  return `${prefix}_${randomPart}`;
}

/**
 * Hashes a plain-text secret using bcrypt.
 */
export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, config.auth.bcryptRounds);
}

/**
 * Verifies a plain-text secret against a bcrypt hash.
 */
export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

/**
 * Generates a 6-digit numeric verification code.
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates a constant-time comparison to prevent timing attacks.
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
