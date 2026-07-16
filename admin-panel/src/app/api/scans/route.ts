import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const password = authHeader?.split('Bearer ')[1]?.toUpperCase();
    if (!password) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let isSuperAdmin = password === process.env.SUPER_ADMIN_PASSWORD?.toUpperCase();
    let canDelete = isSuperAdmin;
    
    if (!isSuperAdmin) {
      const user = await prisma.adminUser.findUnique({ where: { password } });
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      canDelete = user.canDelete;
    }

    const { action, scanIds, deviceId } = await req.json();

    if (action === "delete") {
      if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      
      await prisma.deviceScan.updateMany({
        where: { id: { in: scanIds } },
        data: { image: null }
      });
      return NextResponse.json({ success: true, deletedCount: scanIds.length });
    }
    
    if (action === "deleteDevice") {
      if (!isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      
      await prisma.deviceScan.deleteMany({
        where: { deviceId }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("Scans API error:", error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
