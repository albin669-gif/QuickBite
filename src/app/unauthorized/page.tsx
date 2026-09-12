import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Access Denied</h1>
        <p className="mt-2 text-sm text-stone-600">
          You do not have the necessary permissions or role required to access this section of QuickBite.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              Go to Home
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="primary" className="w-full sm:w-auto">
              Switch Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
