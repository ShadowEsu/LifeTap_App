'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getUser, clearAuthToken } from '@/lib/auth';

export default function Header() {
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearAuthToken();
    toast.success('Logged out');
    router.push('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold gradient-text">LifeTap</div>
        </Link>
        
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/ai-agent"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              AI Agent
            </Link>
            <Link
              href="/history"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              History
            </Link>
            <Link
              href="/emergency-contacts"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Contacts
            </Link>
          </nav>

          <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
            {user && (
              <span className="text-sm text-gray-600">{user.email}</span>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
