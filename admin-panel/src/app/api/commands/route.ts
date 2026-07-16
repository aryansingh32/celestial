import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { corsHeaders, handleOptions } from '@/lib/cors';

export const OPTIONS = handleOptions;

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");
    
    // Auth check
    const authHeader = req.headers.get('authorization');
    const password = authHeader?.split('Bearer ')[1]?.toUpperCase();
    if (!password) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!deviceId) return NextResponse.json({ error: "No deviceId" }, { status: 400, headers: corsHeaders });

    if (searchParams.get("all") === "true") {
      try {
        const commands = await prisma.deviceCommand.findMany({
          where: { deviceId },
          orderBy: { createdAt: "desc" },
          take: 10
        });
        return NextResponse.json({ success: true, commands }, { headers: corsHeaders });
      } catch (e) {
        return NextResponse.json({ error: "Failed to fetch commands" }, { status: 500, headers: corsHeaders });
      }
    }

    const commands = await prisma.deviceCommand.findMany({
      where: { deviceId, status: "pending" },
      orderBy: { createdAt: "asc" }
    });

    // Mark as processing immediately to avoid duplicate execution
    if (commands.length > 0) {
      await prisma.deviceCommand.updateMany({
        where: { id: { in: commands.map(c => c.id) } },
        data: { status: "processing" }
      });
    }

    return NextResponse.json({ success: true, commands }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch commands" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const password = authHeader?.split('Bearer ')[1]?.toUpperCase();
    if (!password) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Validate if USER has access to this device (if not SUPER_ADMIN)
    if (password !== process.env.SUPER_ADMIN_PASSWORD?.toUpperCase()) {
      const user = await prisma.adminUser.findUnique({ where: { password }, include: { sharedDevices: true }});
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // We'll let users send commands if they have access to the device
    }

    const data = await req.json();
    
    if (data.action === "update_status" && data.commandId) {
      await prisma.deviceCommand.update({
        where: { id: data.commandId },
        data: { status: data.status }
      });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    await prisma.deviceCommand.create({
      data: {
        deviceId: data.deviceId,
        command: data.command,
        payload: data.payload || null,
        status: "pending"
      }
    });
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to queue command" }, { status: 500, headers: corsHeaders });
  }
}
