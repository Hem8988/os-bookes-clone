import { transaction } from '@/lib/db';
import { requireAuth } from '@/lib/server/auth';
import { Effects } from '@/lib/server/effects';
import { handle, ok, optStr, readJson, str } from '@/lib/server/http';
import { requestAdjustment } from '@/lib/server/stock';

/** Stock / customer-holding correction. Admin applies; others request approval. */
export const POST = handle(async (request: Request) => {
  const auth = await requireAuth(request, 'stock.adjust.request', { write: true });
  const body = await readJson(request);
  const effects = new Effects();
  const result = await transaction((tx) =>
    requestAdjustment(
      tx,
      auth,
      {
        target: body.target === 'CUSTOMER' ? 'CUSTOMER' : 'LOCATION',
        locationType: body.locationType === 'DELIVERY_BOY' ? 'DELIVERY_BOY' : 'WAREHOUSE',
        locationId: optStr(body.locationId) || undefined,
        customerId: optStr(body.customerId) || undefined,
        productId: str(body.productId, 'Product', { required: true }),
        fullDelta: Number(body.fullDelta || 0),
        emptyDelta: Number(body.emptyDelta || 0),
        defectiveDelta: Number(body.defectiveDelta || 0),
        qtyDelta: Number(body.qtyDelta || 0),
        reason: str(body.reason, 'Reason', { required: true, max: 300 }),
      },
      effects
    )
  );
  effects.schedule();
  return ok(result, result.applied ? 'Adjustment applied.' : 'Adjustment sent to admin for approval.');
});
