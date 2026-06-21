'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { contactsAPI } from '@/lib/api-client';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';

interface Contact {
  id: string;
  name: string;
  phone: string;
  risk_threshold: string;
  verified: boolean;
}

export default function EmergencyContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', risk_threshold: 'high' });

  useEffect(() => {
    loadContacts();
  }, [router]);

  const loadContacts = async () => {
    try {
      const response = await contactsAPI.getAll();
      setContacts(response.data);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await contactsAPI.create(newContact.name, newContact.phone, newContact.risk_threshold);
      toast.success('Contact added! Verification SMS sent.');
      setNewContact({ name: '', phone: '', risk_threshold: 'high' });
      setShowForm(false);
      loadContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add contact');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await contactsAPI.delete(contactId);
      toast.success('Contact deleted');
      loadContacts();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  return (
    <div className="flex h-screen bg-gradient-subtle">
      <Navigation />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Emergency Contacts</h1>
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn btn-primary"
              >
                {showForm ? 'Cancel' : 'Add Contact'}
              </button>
            </div>

            {showForm && (
              <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-4">Add New Contact</h2>
                <form onSubmit={handleAddContact} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      required
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Notify on Risk Level</label>
                    <select
                      value={newContact.risk_threshold}
                      onChange={(e) => setNewContact({ ...newContact, risk_threshold: e.target.value })}
                    >
                      <option value="low">Low and Above</option>
                      <option value="medium">Medium and Above</option>
                      <option value="high">High Only</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary w-full">
                    Add Contact
                  </button>
                </form>
              </div>
            )}

            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading contacts...</div>
              ) : contacts.length === 0 ? (
                <div className="card text-center py-12 text-gray-500">
                  No emergency contacts yet. Add your first contact to get started.
                </div>
              ) : (
                contacts.map((contact) => (
                  <div key={contact.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{contact.name}</h3>
                        <p className="text-gray-600">{contact.phone}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            Threshold: <span className="font-medium">{contact.risk_threshold}</span>
                          </span>
                          {contact.verified ? (
                            <span className="badge badge-low">Verified</span>
                          ) : (
                            <span className="badge badge-medium">Pending Verification</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="btn btn-secondary"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
