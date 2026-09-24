import webpush from 'web-push';
import { prisma } from '@/lib/db';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
let configured = false;

export const pushConfigured = () => !!(PUBLIC_KEY && PRIVATE_KEY);

function setup() {
  if (configured || !pushConfigured()) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
}

/** Web-push to every registered browser of the given users. */
export async function sendPush(userIds: string[], payload: { title: string; body: string; link?: string }) {
  if (!pushConfigured() || userIds.length === 0) return;
  setup();
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    })
  );
}
