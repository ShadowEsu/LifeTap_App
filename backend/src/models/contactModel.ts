/**
 * Emergency Contact Model - Data access layer for the emergency_contacts table.
 */

import { getPool } from '../config/database';
import { EmergencyContact, NotificationPreference } from '../types';
import { generateId } from '../utils/crypto';
import { DatabaseError, NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface CreateContactInput {
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_active: boolean;
  notification_preference: NotificationPreference;
}

interface ContactRow {
  contact_id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_active: boolean;
  notification_preference: NotificationPreference;
  verified: boolean;
  verified_at: Date | null;
  verification_code: string | null;
  total_alerts_notified: number;
  total_responses: number;
  created_at: Date;
  updated_at: Date;
}

function rowToContact(row: ContactRow): EmergencyContact {
  return {
    contact_id: row.contact_id,
    user_id: row.user_id,
    name: row.name,
    phone: row.phone,
    relationship: row.relationship,
    is_active: row.is_active,
    notification_preference: row.notification_preference,
    verified: row.verified,
    verified_at: row.verified_at ?? undefined,
    verification_code: row.verification_code ?? undefined,
    total_alerts_notified: row.total_alerts_notified,
    total_responses: row.total_responses,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createContact(input: CreateContactInput): Promise<EmergencyContact> {
  const pool = getPool();
  const contactId = generateId('contact');

  try {
    const result = await pool.query<ContactRow>(
      `INSERT INTO emergency_contacts (
         contact_id, user_id, name, phone, relationship,
         is_active, notification_preference
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        contactId,
        input.user_id,
        input.name,
        input.phone,
        input.relationship,
        input.is_active,
        input.notification_preference,
      ],
    );

    const row = result.rows[0];
    if (!row) throw new DatabaseError('Failed to create contact');

    logger.info({ contactId, userId: input.user_id }, 'Emergency contact created');
    return rowToContact(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      throw new ConflictError(
        'A contact with this phone number already exists for your account',
        { phone: input.phone },
      );
    }
    throw new DatabaseError(`Failed to create contact: ${String(err)}`);
  }
}

export async function findContactById(contactId: string): Promise<EmergencyContact> {
  const pool = getPool();

  try {
    const result = await pool.query<ContactRow>(
      'SELECT * FROM emergency_contacts WHERE contact_id = $1',
      [contactId],
    );

    if (result.rows.length === 0) throw new NotFoundError('Contact', contactId);
    const row = result.rows[0];
    if (!row) throw new NotFoundError('Contact', contactId);
    return rowToContact(row);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to find contact: ${String(err)}`);
  }
}

export async function listContacts(
  userId: string,
  activeOnly = false,
): Promise<EmergencyContact[]> {
  const pool = getPool();

  try {
    const query = activeOnly
      ? 'SELECT * FROM emergency_contacts WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at ASC'
      : 'SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY created_at ASC';

    const result = await pool.query<ContactRow>(query, [userId]);
    return result.rows.map(rowToContact);
  } catch (err) {
    throw new DatabaseError(`Failed to list contacts: ${String(err)}`);
  }
}

export async function listActiveContactsForAlert(userId: string): Promise<EmergencyContact[]> {
  const pool = getPool();

  try {
    const result = await pool.query<ContactRow>(
      `SELECT * FROM emergency_contacts
       WHERE user_id = $1
         AND is_active = TRUE
         AND verified = TRUE
       ORDER BY created_at ASC`,
      [userId],
    );

    return result.rows.map(rowToContact);
  } catch (err) {
    throw new DatabaseError(`Failed to fetch active contacts: ${String(err)}`);
  }
}

export async function updateContact(
  contactId: string,
  updates: Partial<
    Pick<
      EmergencyContact,
      'name' | 'is_active' | 'notification_preference' | 'relationship'
    >
  >,
): Promise<EmergencyContact> {
  const pool = getPool();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const allowedFields: Array<keyof typeof updates> = [
    'name',
    'is_active',
    'notification_preference',
    'relationship',
  ];

  allowedFields.forEach((key) => {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(updates[key]);
    }
  });

  if (fields.length === 0) return findContactById(contactId);

  values.push(contactId);

  try {
    const result = await pool.query<ContactRow>(
      `UPDATE emergency_contacts
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE contact_id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) throw new NotFoundError('Contact', contactId);
    const row = result.rows[0];
    if (!row) throw new NotFoundError('Contact', contactId);
    return rowToContact(row);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to update contact: ${String(err)}`);
  }
}

export async function deleteContact(contactId: string): Promise<void> {
  const pool = getPool();

  try {
    const result = await pool.query(
      'DELETE FROM emergency_contacts WHERE contact_id = $1',
      [contactId],
    );

    if (result.rowCount === 0) throw new NotFoundError('Contact', contactId);
    logger.info({ contactId }, 'Emergency contact deleted');
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new DatabaseError(`Failed to delete contact: ${String(err)}`);
  }
}

export async function verifyContact(
  contactId: string,
  verificationCode: string,
): Promise<EmergencyContact | null> {
  const pool = getPool();

  try {
    const result = await pool.query<ContactRow>(
      `UPDATE emergency_contacts
       SET verified = TRUE,
           verified_at = NOW(),
           verification_code = NULL,
           updated_at = NOW()
       WHERE contact_id = $1
         AND verification_code = $2
         AND verified = FALSE
       RETURNING *`,
      [contactId, verificationCode],
    );

    if (result.rows.length === 0) return null; // Invalid or already verified
    const row = result.rows[0];
    if (!row) return null;
    logger.info({ contactId }, 'Contact phone verified');
    return rowToContact(row);
  } catch (err) {
    throw new DatabaseError(`Failed to verify contact: ${String(err)}`);
  }
}

export async function setVerificationCode(contactId: string, code: string): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(
      'UPDATE emergency_contacts SET verification_code = $2, updated_at = NOW() WHERE contact_id = $1',
      [contactId, code],
    );
  } catch (err) {
    throw new DatabaseError(`Failed to set verification code: ${String(err)}`);
  }
}
