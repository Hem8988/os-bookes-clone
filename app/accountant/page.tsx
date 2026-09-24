import Workspace from '@/components/Workspace';

// Same workspace as the admin portal; the accountant's menu and data are
// limited by the permission matrix (verification, payments, ledgers, closing).
export default function AccountantPage() {
  return <Workspace />;
}
