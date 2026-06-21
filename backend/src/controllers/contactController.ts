/**
 * Contact Controller - Handles all /api/v1/contacts endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createContact,
  findContactById,
  listContacts,
  updateContact,
  deleteContact,
  verifyContact,
  setVerificationCode,
} from '../models/contactModel';
import { sendVerificationSms } from '../services/twilioService';
import { sendSuccess } from '../utils/response';
import { assertOwnership } from '../middleware/auth';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { NotificationPreference } from '../types';
import { generateVerificationCode } from '../utils/crypto';
import { logger } from '../utils/logger';

// ---- Validation Schemas ------------------------------------

export const createContactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +1234567890)'),
  relationship: z.string().min(1).max(100),
  is_active: z.boolean().default(true),
  notification_preference: z.nativeEnum(NotificationPreference).default(NotificationPreference.ALWAYS),
});

export const updateContactSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    relationship: z.string().min(1).max(100).optional(),
    is_active: z.boolean().optional(),
    notification_preference: z.nativeEnum(NotificationPreference).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const verifyContactSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Must be numeric'),
});

// ---- Handlers ----------------------------------------------

export async function createContactHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new BadRequestError('Authentication required');

    const body = req.body as z.infer<typeof createContactSchema>;

    const contact = await createContact({
      user_id: req.user.sub,
      name: body.name,
      phone: body.phone,
      relationship: body.relationship,
      is_active: body.is_active,
      notification_preference: body.notification_preference,
    });

    // Generate and send verification code
    try {
      const code = generateVerificationCode();
      await setVerificationCode(contact.contact_id, code);
      await sendVerificationSms(contact.phone, code);
    } catch (err) {
      // Verification SMS failure does not fail contact creation
      logger.warn({ err, contactId: contact.contact_id }, 'Failed to send verification SMS');
    }

    sendSuccess(res, contact, { statusCode: 201 });
  } catch (err) {
    next(err);
  }
}

export async function getContactHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contact_id } = req.params as { contact_id: string };

    const contact = await findContactById(contact_id);
    assertOwnership(req, contact.user_id, 'contact');

    sendSuccess(res, contact);
  } catch (err) {
    next(err);
  }
}

export async function listContactsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new BadRequestError('Authentication required');

    const activeOnly = req.query['active_only'] === 'true';
    const contacts = await listContacts(req.user.sub, activeOnly);

    sendSuccess(res, contacts, { total: contacts.length });
  } catch (err) {
    next(err);
  }
}

export async function updateContactHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contact_id } = req.params as { contact_id: string };
    const body = req.body as z.infer<typeof updateContactSchema>;

    const existing = await findContactById(contact_id);
    assertOwnership(req, existing.user_id, 'contact');

    const updated = await updateContact(contact_id, body);

    sendSuccess(res, {
      contact_id: updated.contact_id,
      name: updated.name,
      is_active: updated.is_active,
      notification_preference: updated.notification_preference,
      updated_at: updated.updated_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteContactHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contact_id } = req.params as { contact_id: string };

    const existing = await findContactById(contact_id);
    assertOwnership(req, existing.user_id, 'contact');

    await deleteContact(contact_id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function verifyContactHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { contact_id } = req.params as { contact_id: string };
    const { code } = req.body as z.infer<typeof verifyContactSchema>;

    const verified = await verifyContact(contact_id, code);

    if (!verified) {
      throw new BadRequestError('Invalid or expired verification code');
    }

    sendSuccess(res, {
      contact_id: verified.contact_id,
      verified: true,
      verified_at: verified.verified_at,
    });
  } catch (err) {
    next(err);
  }
}
