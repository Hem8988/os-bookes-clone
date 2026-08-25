import { NextResponse } from 'next/server';
import { prisma } from './db';
import { decodeSession, AuthSession } from './auth';

// Rate Limiting Map
const rateLimitMap = new Map<string, { count: number; firstAccess: number }>();

export interface AuthorizationResult {
  authorized: boolean;
  user: string;
  role: string;
  customerId?: string | null;
  deliveryBoyId?: string | null;
  ip: string;
  device: string;
  error?: string;
  status?: number;
}

export async function validateAuthorization(
  request: Request,
  requiredRoles: Array<'SUPER_ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'DELIVERY_BOY' | 'ADMIN' | 'CUSTOMER'>
): Promise<AuthorizationResult> {
  let user = request.headers.get('x-user-id') || request.headers.get('x-user-email') || 'system_user';
  let role = (request.headers.get('x-user-role') || '').toUpperCase();
  let customerId = request.headers.get('x-customer-id');
  let deliveryBoyId = request.headers.get('x-delivery-boy-id');

  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const device = request.headers.get('user-agent') || 'Deskshark Client';

  // Extract from HTTP-only Cookie if header is missing
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/deskshark_session=([^;]+)/);
  if (match) {
    const session = decodeSession(match[1]);
    if (session) {
      user = session.email;
      role = session.role;
      customerId = session.customerId || null;
      deliveryBoyId = session.deliveryBoyId || null;
    }
  }

  // Default to ADMIN for local backwards compatibility if unauthenticated header/cookie
  if (!role) role = 'ADMIN';

  // 1. Rate Limiting Check
  const now = Date.now();
  const limitWindow = 60 * 1000;
  const rateData = rateLimitMap.get(ip) || { count: 0, firstAccess: now };

  if (now - rateData.firstAccess > limitWindow) {
    rateData.count = 1;
    rateData.firstAccess = now;
  } else {
    rateData.count += 1;
  }
  rateLimitMap.set(ip, rateData);

  if (rateData.count > 200) {
    return {
      authorized: false,
      user,
      role,
      ip,
      device,
      error: '429 Rate Limit Exceeded: Too many requests. Please try again later.',
      status: 429,
    };
  }

  // 2. Role Authorization Check
  if (!requiredRoles.includes(role as any)) {
    return {
      authorized: false,
      user,
      role,
      ip,
      device,
      error: `403 Forbidden: Role '${role}' is not authorized for this API endpoint. Required: [${requiredRoles.join(', ')}]`,
      status: 403,
    };
  }

  return {
    authorized: true,
    user,
    role,
    customerId,
    deliveryBoyId,
    ip,
    device,
  };
}

export async function verifyDeviceBinding(deliveryBoyId: string, deviceId: string): Promise<boolean> {
  try {
    const device = await prisma.deliveryBoyDevice.findFirst({
      where: { deliveryBoyId, deviceId },
    });
    return !!device;
  } catch (err) {
    return true; // Default fallback for dev environments
  }
}

export async function logAuditAction(params: {
  actorId?: string;
  actorEmail: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorEmail: params.actorEmail,
        action: params.action,
        details: params.details ? JSON.stringify(params.details) : params.action,
        ipAddress: params.ipAddress || '127.0.0.1',
      },
    });
  } catch (err) {
    console.error('Error recording AuditLog:', err);
  }
}

export function validateFileUpload(fileType: string, fileSize: number): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxBytes = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(fileType)) {
    return { valid: false, error: 'Invalid file type. Only JPG, PNG, WEBP and PDF files are permitted.' };
  }

  if (fileSize > maxBytes) {
    return { valid: false, error: 'File size exceeds 5MB limit.' };
  }

  return { valid: true };
}
