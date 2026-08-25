import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        deliveryBoyId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, mobile, role, password = 'password123', deliveryBoyId } = body;

    if (!email || !name || !role) {
      return NextResponse.json({ success: false, error: 'Name, Email/Mobile, and Role are required' }, { status: 400 });
    }

    const validRoles = ['ADMIN', 'ACCOUNTANT', 'DELIVERY_BOY', 'CUSTOMER', 'SUPER_ADMIN', 'MANAGER'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role specified' }, { status: 400 });
    }

    const mapRole = (role === 'SUPER_ADMIN' || role === 'MANAGER') ? 'ADMIN' : role;
    const hashedPassword = hashPassword(password);
    const userEmail = email.trim().toLowerCase();

    // Create or Update User Record in Database
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: name.trim(),
        mobile: mobile || null,
        role: mapRole,
        deliveryBoyId: mapRole === 'DELIVERY_BOY' ? (deliveryBoyId || `del_boy_${Date.now()}`) : null,
      },
      create: {
        name: name.trim(),
        email: userEmail,
        mobile: mobile || null,
        password: hashedPassword,
        role: mapRole,
        status: 'ACTIVE',
        deliveryBoyId: mapRole === 'DELIVERY_BOY' ? (deliveryBoyId || `del_boy_${Date.now()}`) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: `User '${user.name}' registered successfully as ${user.role}! Login email: ${user.email}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
