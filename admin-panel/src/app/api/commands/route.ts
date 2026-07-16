import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { corsHeaders, handleOptions } from '@/lib/cors';

export const OPTIONS = handleOptions;

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("deviceId");

  if (!deviceId) return NextResponse.json({ error: "No deviceId" }, { status: 400, headers: corsHeaders });

  try {
    const commands = await prisma.deviceCommand.findMany({
      where: { deviceId, status: "pending" },
      orderBy: { createdAt: "asc" }
    });

    // Mark as completed immediately to avoid duplicate execution
    if (commands.length > 0) {
      await prisma.deviceCommand.updateMany({
        where: { id: { in: commands.map(c => c.id) } },
        data: { status: "completed" }
      });
    }

    return NextResponse.json({ success: true, commands }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch commands" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
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
