'use client';

import React from 'react';
import { LoginPage } from '@/components/LoginPage';

export default function LoginPageApp() {
  const handleLoginSuccess = (user: any, redirectPath: string) => {
    window.location.href = redirectPath;
  };

  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
}
