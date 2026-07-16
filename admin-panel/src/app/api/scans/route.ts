import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { action, scanIds } = await req.json();

    if (action === 'delete' && Array.isArray(scanIds)) {
      await prisma.deviceScan.deleteMany({
        where: { id: { in: scanIds } }
      });
      return NextResponse.json({ success: true, deletedCount: scanIds.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("Scans API error:", error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
