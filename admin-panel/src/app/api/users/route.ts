import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

// Only SUPER_ADMIN can manage users
const isSuperAdmin = (req: Request) => {
  const authHeader = req.headers.get('authorization');
  const password = authHeader?.split('Bearer ')[1]?.toUpperCase();
  return password === process.env.SUPER_ADMIN_PASSWORD?.toUpperCase();
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

  if (action === 'CHANGE_PASSWORD') {
    const { newPassword } = body;
    if (!newPassword || newPassword.length !== 6) return NextResponse.json({ error: 'Password must be 6 chars' }, { status: 400 });
    
    // check if it exists
    const existing = await prisma.adminUser.findUnique({ where: { password: newPassword.toUpperCase() } });
    if (existing) return NextResponse.json({ error: 'Password already in use' }, { status: 400 });
    
    await prisma.adminUser.update({
      where: { id: userId },
      data: { password: newPassword.toUpperCase() }
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'SHARE_ALL') {
    const { deviceIds } = body; // Array of all device strings
    if (!Array.isArray(deviceIds)) return NextResponse.json({ error: 'Invalid deviceIds' }, { status: 400 });
    
    // Create all
    await prisma.$transaction(
      deviceIds.map((dId: string) => 
        prisma.deviceShare.upsert({
          where: { adminUserId_deviceId: { adminUserId: userId, deviceId: dId } },
          create: { adminUserId: userId, deviceId: dId },
          update: {}
        })
      )
    );
    return NextResponse.json({ success: true });
  }

  if (action === 'UNSHARE_ALL') {
    await prisma.deviceShare.deleteMany({
      where: { adminUserId: userId }
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'SET_AUTO_SHARE_FUTURE') {
    const { autoShareFuture } = body;
    await prisma.adminUser.update({
      where: { id: userId },
      data: { autoShareFuture: Boolean(autoShareFuture) }
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
