'use client';

import React, { useState, useEffect } from 'react';
import Home from '../page';

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated) setSession(json.user);
        else setSession({ name: 'Dhananjay (System Admin)', role: 'ADMIN' });
      })
      .catch(() => setSession({ name: 'Dhananjay (System Admin)', role: 'ADMIN' }));
  }, []);

  return <Home />;
}
