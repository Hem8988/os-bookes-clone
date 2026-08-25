'use client';

import React, { useState, useEffect } from 'react';
import { CustomerPortalModule } from '@/components/CustomerPortalModule';

export default function CustomerPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated && json.user) {
          setSession(json.user);
        } else {
          // Fallback session for demo testing
          setSession({
            id: 'usr_cust_demo',
            name: 'Hotel Rajdhani (Customer)',
            email: 'customer@deskshark.com',
            role: 'CUSTOMER',
            customerId: 'cust_demo_1',
          });
        }
      })
      .catch(() => {
        setSession({
          id: 'usr_cust_demo',
          name: 'Hotel Rajdhani (Customer)',
          email: 'customer@deskshark.com',
          role: 'CUSTOMER',
          customerId: 'cust_demo_1',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Customer Portal...</div>;
  }

  return <CustomerPortalModule userSession={session} onLogout={handleLogout} />;
}
