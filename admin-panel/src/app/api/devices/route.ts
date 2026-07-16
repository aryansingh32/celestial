import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const password = authHeader?.split('Bearer ')[1]?.toUpperCase();
    if (!password) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let allowedDevices: string[] | null = null;
    let isSuperAdmin = false;

    if (password === process.env.SUPER_ADMIN_PASSWORD?.toUpperCase()) {
      isSuperAdmin = true;
    } else {
      const user = await prisma.adminUser.findUnique({
        where: { password },
        include: { sharedDevices: true }
      });
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      allowedDevices = user.sharedDevices.map(s => s.deviceId);
    }

    const devices = await prisma.deviceScan.findMany({
      where: isSuperAdmin ? undefined : { deviceId: { in: allowedDevices || [] } },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = devices.reduce((acc, scan) => {
      const key = scan.deviceId || `${scan.publicIp || 'unknown'}-${scan.userAgent || 'unknown'}`;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          deviceId: scan.deviceId,
          publicIp: scan.publicIp,
          userAgent: scan.userAgent,
          screenResolution: scan.screenResolution,
          timezone: scan.timezone,
          language: scan.language,
          deviceMemory: scan.deviceMemory,
          hardwareConcurrency: scan.hardwareConcurrency,
          lastSeen: scan.createdAt,
          scans: [],
        };
      }
      // Keep lastSeen up to date with the most recent scan (which is first due to desc order)
      if (new Date(scan.createdAt) > new Date(acc[key].lastSeen)) {
        acc[key].lastSeen = scan.createdAt;
      }
      acc[key].scans.push(scan);
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}
