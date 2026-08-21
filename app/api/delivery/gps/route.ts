import { NextResponse } from 'next/server';

let activeLocations: any[] = [
  { deliveryBoyId: 'del_boy_1', name: 'Ramesh Kumar', lat: 28.6289, lng: 77.2065, speed: '24 km/h', battery: '85%', lastUpdated: new Date().toISOString() },
  { deliveryBoyId: 'del_boy_2', name: 'Suresh Verma', lat: 28.6328, lng: 77.2197, speed: '18 km/h', battery: '92%', lastUpdated: new Date().toISOString() },
];

export async function GET() {
  return NextResponse.json({ success: true, data: activeLocations });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deliveryBoyId, name, lat, lng, speed, battery } = body;

    const existing = activeLocations.find(l => l.deliveryBoyId === deliveryBoyId);
    if (existing) {
      existing.lat = lat;
      existing.lng = lng;
      existing.speed = speed || '0 km/h';
      existing.battery = battery || '100%';
      existing.lastUpdated = new Date().toISOString();
    } else {
      activeLocations.push({
        deliveryBoyId,
        name: name || deliveryBoyId,
        lat,
        lng,
        speed: speed || '0 km/h',
        battery: battery || '100%',
        lastUpdated: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, data: activeLocations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
