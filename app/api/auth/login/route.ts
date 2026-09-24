import { handle, readJson, str } from '@/lib/server/http';
import { beginLogin } from '@/lib/server/login';

export const POST = handle(async (request: Request) => {
  const body = await readJson<Record<string, unknown>>(request);
  return beginLogin(request, {
    identifier: str(body.identifier ?? body.email, 'Email or mobile', { required: true, max: 120 }),
    password: str(body.password, 'Password', { required: true, max: 200 }),
    deviceId: typeof body.deviceId === 'string' ? body.deviceId : null,
    deviceLabel: typeof body.deviceLabel === 'string' ? body.deviceLabel : null,
    latitude: typeof body.latitude === 'number' ? body.latitude : null,
    longitude: typeof body.longitude === 'number' ? body.longitude : null,
  });
});
