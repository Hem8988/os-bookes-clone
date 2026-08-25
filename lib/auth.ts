import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
import { prisma } from './db';
import cryptoNode from 'crypto';

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'DELIVERY_BOY' | 'CUSTOMER';
  customerId?: string | null;
  deliveryBoyId?: string | null;
  tenantId?: string;
}

export function hashPassword(password: string): string {
  return cryptoNode.createHash('sha256').update(password + 'deskshark_salt_2026').digest('hex');
}

export function verifyPassword(password: string, hashed: string): boolean {
  return hashPassword(password) === hashed;
}

export function encodeSession(session: AuthSession): string {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

export function decodeSession(token: string): AuthSession | null {
  try {
    const json = Buffer.from(token, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export async function seedUsersIfMissing() {
  try {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount === 0) {
      const hashedAdmin = hashPassword('admin123');
      const hashedAcc = hashPassword('acc123');
      const hashedDriver = hashPassword('driver123');
      const hashedCust = hashPassword('cust123');

      await Promise.all([
        prisma.user.create({
          data: {
            name: 'Dhananjay (System Admin)',
            email: 'admin@deskshark.com',
            mobile: '9876543210',
            password: hashedAdmin,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        }),
        prisma.user.create({
          data: {
            name: 'Ravi (Chief Accountant)',
            email: 'accountant@deskshark.com',
            mobile: '9876543211',
            password: hashedAcc,
            role: 'ACCOUNTANT',
            status: 'ACTIVE',
          },
        }),
        prisma.user.create({
          data: {
            name: 'Amit (Fleet Driver)',
            email: 'driver@deskshark.com',
            mobile: '9876543212',
            password: hashedDriver,
            role: 'DELIVERY_BOY',
            deliveryBoyId: 'del_boy_ramesh',
            status: 'ACTIVE',
          },
        }),
        prisma.user.create({
          data: {
            name: 'Hotel Rajdhani (Customer)',
            email: 'customer@deskshark.com',
            mobile: '9876543213',
            password: hashedCust,
            role: 'CUSTOMER',
            customerId: 'cust_demo_1',
            status: 'ACTIVE',
          },
        }),
      ]);
      console.log('[Auth Seed] 4 Role Users seeded in database cleanly.');
    }
  } catch (err) {
    console.error('Error seeding auth users:', err);
  }
}
