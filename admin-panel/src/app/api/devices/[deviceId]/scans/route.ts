import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: { deviceId: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const password = authHeader?.split('Bearer ')[1]?.toUpperCase();
    if (!password) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deviceId } = params;

    let isAllowed = false;
    if (password === process.env.SUPER_ADMIN_PASSWORD?.toUpperCase()) {
      isAllowed = true;
    } else {
      const user = await prisma.adminUser.findUnique({
        where: { password },
        include: { sharedDevices: true }
      });
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      isAllowed = user.sharedDevices.some(s => s.deviceId === deviceId);
    }

    if (!isAllowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const scans = await prisma.deviceScan.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        image: true,
        userName: true,
        birthDate: true,
        birthState: true,
        birthCity: true,
        birthTime: true,
        latitude: true,
        longitude: true,
      }
    });

    return NextResponse.json({ success: true, scans });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
  }
}
