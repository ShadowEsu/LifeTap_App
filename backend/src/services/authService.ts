/**
 * Authentication Service
 * Manages JWT token creation, validation, and the login/register flows.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { JwtPayload, DeviceJwtPayload } from '../types';
import { UnauthorizedError } from '../utils/errors';
import { verifySecret, generateSecureToken, hashSecret } from '../utils/crypto';
import {
  createUser,
  findUserByEmail,
  saveRefreshToken,
  invalidateRefreshToken,
} from '../models/userModel';
import { getPool } from '../config/database';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginResult {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: {
    user_id: string;
    email: string;
    name: string;
  };
}

export interface RefreshResult {
  access_token: string;
  expires_in: number;
}

/**
 * Generates a signed JWT access token.
 */
export function generateAccessToken(userId: string, email: string): string {
  const payload: JwtPayload = {
    sub: userId,
    email,
    type: 'access',
  };

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtAccessExpiry,
  });
}

/**
 * Generates a signed JWT device token (long-lived, for Raspberry Pi).
 */
export function generateDeviceToken(deviceId: string, userId: string): string {
  const payload: DeviceJwtPayload = {
    sub: deviceId,
    user_id: userId,
    type: 'device',
  };

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: '365d', // Device tokens are valid for 1 year
  });
}

/**
 * Registers a new user account.
 */
export async function register(input: RegisterInput) {
  // Validate password strength
  if (input.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  return createUser({
    email: input.email,
    password: input.password,
    name: input.name,
    phone: input.phone,
  });
}

/**
 * Authenticates a user and issues JWT tokens.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await verifySecret(password, user.password_hash);
  if (!isPasswordValid) {
    logger.warn({ email }, 'Failed login attempt — incorrect password');
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = generateAccessToken(user.user_id, user.email);
  const refreshToken = generateSecureToken(48);

  await saveRefreshToken(user.user_id, refreshToken);

  logger.info({ userId: user.user_id, email }, 'User logged in successfully');

  const expiresIn = config.auth.jwtAccessExpiry === '15m' ? 900 : 86400;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    user: {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
    },
  };
}

/**
 * Exchanges a refresh token for a new access token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  const pool = getPool();

  const result = await pool.query<{ user_id: string; token_hash: string; expires_at: Date }>(
    'SELECT user_id, token_hash, expires_at FROM refresh_tokens WHERE expires_at > NOW()',
  );

  // Find the matching token (compare all stored hashes)
  let matchedUserId: string | null = null;

  for (const row of result.rows) {
    const isMatch = await verifySecret(refreshToken, row.token_hash);
    if (isMatch) {
      if (row.expires_at < new Date()) {
        throw new UnauthorizedError('Refresh token has expired');
      }
      matchedUserId = row.user_id;
      break;
    }
  }

  if (!matchedUserId) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const pool2 = getPool();
  const userResult = await pool2.query<{ email: string }>(
    'SELECT email FROM users WHERE user_id = $1',
    [matchedUserId],
  );

  const user = userResult.rows[0];
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const accessToken = generateAccessToken(matchedUserId, user.email);

  logger.info({ userId: matchedUserId }, 'Access token refreshed');

  return {
    access_token: accessToken,
    expires_in: 900,
  };
}

/**
 * Logs out a user by invalidating their refresh token.
 */
export async function logout(userId: string): Promise<void> {
  await invalidateRefreshToken(userId);
  logger.info({ userId }, 'User logged out');
}

/**
 * Finds which user owns a given device by its user_id stored in the device token.
 */
export async function resolveUserFromPhone(phone: string): Promise<string | null> {
  const pool = getPool();
  const result = await pool.query<{ user_id: string }>(
    'SELECT user_id FROM users WHERE phone = $1',
    [phone],
  );
  return result.rows[0]?.user_id ?? null;
}
