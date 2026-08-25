import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'tenant_default';

    const routes = await prisma.route.findMany({
      where: { tenantId, active: true },
      include: { areas: true },
      orderBy: { name: 'asc' },
    });

    if (routes.length === 0) {
      return NextResponse.json({
        success: true,
        data: [
          { id: 'route_1', code: 'RT-CENTRAL', name: 'Central Commercial Route', defaultDeliveryBoyId: 'del_boy_ramesh', areas: [{ name: 'Connaught Place' }, { name: 'Karol Bagh Market' }] },
          { id: 'route_2', code: 'RT-SOUTH', name: 'South Industrial Route', defaultDeliveryBoyId: 'del_boy_suresh', areas: [{ name: 'Okhla Industrial Area' }] },
        ],
      });
    }

    return NextResponse.json({ success: true, data: routes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, defaultDeliveryBoyId, tenantId = 'tenant_default' } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: 'Route Code and Name are required' }, { status: 400 });
    }

    const route = await prisma.route.create({
      data: {
        tenantId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        defaultDeliveryBoyId: defaultDeliveryBoyId || null,
      },
      include: { areas: true },
    });

    return NextResponse.json({ success: true, data: route });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
