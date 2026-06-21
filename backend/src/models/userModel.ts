/**
 * User Model - Data access layer for the users table.
 */

import { PoolClient } from 'pg';
import { getPool } from '../config/database';
import { User, UserPublic } from '../types';
import { generateId, hashSecret } from '../utils/crypto';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface UserRow {
  user_id: string;
  email: string;
  name: string;
  phone: string | null;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

function rowToUser(row: UserRow): User {
  return {
    user_id: row.user_id,
    email: row.email,
    name: row.name,
    phone: row.phone ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createUser(input: CreateUserInput): Promise<UserPublic> {
  const pool = getPool();
  const userId = generateId('user');
  const passwordHash = await hashSecret(input.password);

  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (user_id, email, name, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, input.email.toLowerCase(), input.name, input.phone ?? null, passwordHash],
    );

    const user = result.rows[0];
    if (!user) throw new DatabaseError('Failed to create user');

    logger.info({ userId: user.user_id }, 'User created');
    return {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      phone: user.phone ?? undefined,
      created_at: user.created_at,
    };
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      // PostgreSQL unique violation
      throw new ConflictError('An account with this email address already exists', {
        email: input.email,
      });
    }
    throw new DatabaseError(`Failed to create user: ${String(err)}`);
  }
}

export async function findUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
  const pool = getPool();

  try {
    const result = await pool.query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()],
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row) return null;

    return {
      ...rowToUser(row),
      password_hash: row.password_hash,
    };
  } catch (err) {
    throw new DatabaseError(`Failed to find user: ${String(err)}`);
  }
}

export async function findUserById(userId: string, client?: PoolClient): Promise<User> {
  const db = client ?? getPool();

  try {
    const result = await db.query<UserRow>(
      'SELECT * FROM users WHERE user_id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    const row = result.rows[0];
    if (!row) throw new NotFoundError('User', userId);
    return rowToUser(row);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to find user: ${String(err)}`);
  }
}

export async function updateUser(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'phone'>>,
): Promise<User> {
  const pool = getPool();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(updates.phone);
  }

  if (fields.length === 0) {
    return findUserById(userId);
  }

  values.push(userId);

  try {
    const result = await pool.query<UserRow>(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    const row = result.rows[0];
    if (!row) throw new NotFoundError('User', userId);
    return rowToUser(row);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to update user: ${String(err)}`);
  }
}

export async function saveRefreshToken(userId: string, token: string): Promise<void> {
  const pool = getPool();
  const tokenHash = await hashSecret(token);

  try {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')
       ON CONFLICT (user_id) DO UPDATE SET token_hash = $2, expires_at = NOW() + INTERVAL '7 days'`,
      [userId, tokenHash],
    );
  } catch (err) {
    throw new DatabaseError(`Failed to save refresh token: ${String(err)}`);
  }
}

export async function invalidateRefreshToken(userId: string): Promise<void> {
  const pool = getPool();
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  } catch (err) {
    throw new DatabaseError(`Failed to invalidate token: ${String(err)}`);
  }
}
