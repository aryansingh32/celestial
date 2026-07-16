import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    
    // Normalize to uppercase for comparison since UI forces uppercase
    const normalizedPassword = password.toUpperCase();
    const superAdminPass = process.env.SUPER_ADMIN_PASSWORD?.toUpperCase();
    
    if (normalizedPassword === superAdminPass) {
      return NextResponse.json({ success: true, role: 'SUPER_ADMIN' });
    }
    
    const user = await prisma.adminUser.findUnique({
      where: { password: normalizedPassword }
    });
    
    if (user) {
      return NextResponse.json({ 
        success: true, 
        role: 'USER',
        userId: user.id,
        canDelete: user.canDelete 
      });
    }
    
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}
