import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { corsHeaders, handleOptions } from '@/lib/cors';

export const OPTIONS = handleOptions;

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    const publicIp = req.headers.get("x-forwarded-for") || "unknown";
    const referer = req.headers.get("referer") || "unknown";

    await prisma.deviceScan.create({
      data: {
        publicIp,
        userAgent: data.userAgent,
        referer,
        language: data.language,
        screenResolution: data.screenResolution,
        hardwareConcurrency: data.hardwareConcurrency,
        deviceMemory: data.deviceMemory,
        timezone: data.timezone,
        touchSupport: data.touchSupport,
        connectionType: data.connectionType,
        userName: data.userName,
        birthDate: data.birthDate,
        birthState: data.birthState,
        birthCity: data.birthCity,
        birthTime: data.birthTime,
        latitude: data.latitude,
        longitude: data.longitude,
        image: data.image || null,
        reading: data.reading ? data.reading as any : { status: "background_collection" },
      },
    });
    
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to collect telemetry" }, { status: 500, headers: corsHeaders });
  }
}
