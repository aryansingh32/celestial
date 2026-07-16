import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Only SUPER_ADMIN can manage users
const isSuperAdmin = (req: Request) => {
  const authHeader = req.headers.get('authorization');
  const password = authHeader?.split('Bearer ')[1];
  return password === process.env.SUPER_ADMIN_PASSWORD;
};

export async function GET(req: Request) {
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const users = await prisma.adminUser.findMany({
    include: { sharedDevices: true }
  });
  return NextResponse.json({ success: true, users });
}

export async function POST(req: Request) {
  if (!isSuperAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const { action, userId, deviceId, canDelete } = body;
  
  if (action === 'CREATE_USER') {
    // Generate 6-char alphanumeric password
    const password = Math.random().toString(36).substring(2, 8).toUpperCase();
    const user = await prisma.adminUser.create({
      data: { name: body.name || 'User', password }
    });
    return NextResponse.json({ success: true, user });
  }
  
  if (action === 'DELETE_USER') {
    await prisma.adminUser.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  }
  
  if (action === 'SHARE_DEVICE') {
    await prisma.deviceShare.upsert({
      where: { adminUserId_deviceId: { adminUserId: userId, deviceId } },
      create: { adminUserId: userId, deviceId },
      update: {}
    });
    return NextResponse.json({ success: true });
  }
  
  if (action === 'UNSHARE_DEVICE') {
    await prisma.deviceShare.delete({
      where: { adminUserId_deviceId: { adminUserId: userId, deviceId } }
    });
    return NextResponse.json({ success: true });
  }
  
  if (action === 'SET_CAN_DELETE') {
    await prisma.adminUser.update({
      where: { id: userId },
      data: { canDelete }
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
