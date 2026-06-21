/**
 * Auth Controller - Handles user registration, login, and token refresh.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { register, login, refreshAccessToken, logout } from '../services/authService';
import { sendSuccess } from '../utils/response';
import { BadRequestError } from '../utils/errors';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format').optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await register(req.body as z.infer<typeof registerSchema>);
    sendSuccess(res, user, { statusCode: 201 });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await login(email, password);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refresh_token } = req.body as z.infer<typeof refreshSchema>;
    const result = await refreshAccessToken(refresh_token);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new BadRequestError('Not authenticated');
    await logout(req.user.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
