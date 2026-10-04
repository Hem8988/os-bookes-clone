import type { Metadata } from 'next';
import Workspace from '@/components/Workspace';

// Installed from a phone, the office opens as its own app at /admin.
export const metadata: Metadata = { manifest: '/manifest-admin.json' };

export default function AdminPage() {
  return <Workspace />;
}
