import { useState, useEffect, useCallback } from 'react';
import { contactsApi } from '@/lib/api-client';
import type { CreateContactRequest, EmergencyContact, UpdateContactRequest } from '@/types';
import { toast } from 'sonner';

export function useContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await contactsApi.list();
      setContacts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contacts';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const createContact = useCallback(
    async (data: CreateContactRequest): Promise<EmergencyContact> => {
      const newContact = await contactsApi.create(data);
      setContacts((prev) => [...prev, newContact]);
      toast.success(`${newContact.name} added as emergency contact`);
      return newContact;
    },
    []
  );

  const updateContact = useCallback(
    async (contactId: string, data: UpdateContactRequest): Promise<EmergencyContact> => {
      const updated = await contactsApi.update(contactId, data);
      setContacts((prev) => prev.map((c) => (c.contact_id === contactId ? updated : c)));
      toast.success('Contact updated successfully');
      return updated;
    },
    []
  );

  const deleteContact = useCallback(async (contactId: string): Promise<void> => {
    await contactsApi.delete(contactId);
    setContacts((prev) => prev.filter((c) => c.contact_id !== contactId));
    toast.success('Contact removed');
  }, []);

  const sendTestSms = useCallback(async (contactId: string): Promise<void> => {
    await contactsApi.sendTestSms(contactId);
    toast.success('Test SMS sent successfully');
  }, []);

  return {
    contacts,
    isLoading,
    error,
    refetch: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    sendTestSms,
  };
}
