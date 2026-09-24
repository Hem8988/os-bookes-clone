import { redirect } from 'next/navigation';

// The proxy sends "/" to the right portal for the logged-in role; this is
// only reached if the proxy is bypassed.
export default function Home() {
  redirect('/login');
}
