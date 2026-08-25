import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'tenant_default';

    const areas = await prisma.area.findMany({
      where: { tenantId, active: true },
      include: { route: true },
      orderBy: { name: 'asc' },
    });

    if (areas.length === 0) {
      // Fallback pre-populated areas for immediate use
      return NextResponse.json({
        success: true,
        data: [
          { id: 'area_1', code: 'CP-01', name: 'Connaught Place', routeId: 'route_1', route: { name: 'Central Commercial Route' } },
          { id: 'area_2', code: 'OKH-02', name: 'Okhla Industrial Area Phase 1', routeId: 'route_2', route: { name: 'South Industrial Route' } },
          { id: 'area_3', code: 'KB-03', name: 'Karol Bagh Market', routeId: 'route_1', route: { name: 'Central Commercial Route' } },
        ],
      });
    }

    return NextResponse.json({ success: true, data: areas });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, routeId, tenantId = 'tenant_default' } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: 'Area Code and Name are required' }, { status: 400 });
    }

    const area = await prisma.area.create({
      data: {
        tenantId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        routeId: routeId || null,
      },
      include: { route: true },
    });

    return NextResponse.json({ success: true, data: area });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
