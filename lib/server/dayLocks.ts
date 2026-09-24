import type { Db } from '@/lib/db';
import { ApiError } from './http';

/** Accountant has locked this business date — no financial or stock entry may change it. */
export async function assertDayOpen(db: Db, tenantId: string, date: string) {
  const closing = await db.dailyClosing.findUnique({ where: { tenantId_date: { tenantId, date } } });
  if (closing?.status === 'LOCKED') {
    throw new ApiError(423, `${date} is closed and locked by accounts. Ask the admin to re-open the day.`, 'DAY_LOCKED');
  }
}

/** The delivery boy must have started (and not yet closed) his day. */
export async function assertDeliveryDayOpen(db: Db, tenantId: string, deliveryBoyId: string, date: string) {
  const day = await db.deliveryDay.findUnique({ where: { tenantId_deliveryBoyId_date: { tenantId, deliveryBoyId, date } } });
  if (!day) throw new ApiError(409, 'Please start your day first.', 'DAY_NOT_STARTED');
  if (day.status === 'CLOSED') throw new ApiError(423, 'Your day is already closed. Ask the admin to re-open it for corrections.', 'DELIVERY_DAY_CLOSED');
  return day;
}
