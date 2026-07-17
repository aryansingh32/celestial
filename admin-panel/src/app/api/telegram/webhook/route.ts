import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.message || !body.message.text) {
      return NextResponse.json({ success: true });
    }

    const chatId = body.message.chat.id.toString();
    const text = body.message.text.trim();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const allowedChatIds = process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.split(',').map(id => id.trim()) : [];

    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN is not configured.");
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const sendMessage = async (msg: string) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
      });
    };

    const sendPhoto = async (base64Image: string, caption: string) => {
      try {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'photo.jpg');
        formData.append('caption', caption);
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
      } catch (err) {
        console.error("Failed to send photo:", err);
        await sendMessage("Failed to process or send photo.");
      }
    };

    if (text === '/start') {
      await sendMessage(`Welcome to *Network Overseer Bot*.\n\nYour Chat ID is: \`${chatId}\`\n\nIf you haven't already, please ensure your Chat ID is added to \`TELEGRAM_CHAT_ID\` in your Railway environment variables (separated by commas if there are multiple users).`);
      return NextResponse.json({ success: true });
    }

    if (allowedChatIds.length > 0 && !allowedChatIds.includes(chatId)) {
      await sendMessage("Unauthorized. Your Chat ID is not on the allowed list.");
      return NextResponse.json({ success: true });
    }

    if (allowedChatIds.length === 0) {
      await sendMessage("Please configure `TELEGRAM_CHAT_ID` in Railway to use bot commands. Multiple IDs can be separated by commas.");
      return NextResponse.json({ success: true });
    }

    const args = text.split(' ');
    const command = args[0].toLowerCase();

    if (command === '/devices') {
      const scans = await prisma.deviceScan.findMany({
        select: { deviceId: true, publicIp: true, userAgent: true }
      });
      
      const devicesMap = new Map();
      scans.forEach(scan => {
        if (!scan.deviceId) return;
        if (!devicesMap.has(scan.deviceId)) {
          devicesMap.set(scan.deviceId, { count: 0, ip: scan.publicIp, ua: scan.userAgent });
        }
        devicesMap.get(scan.deviceId).count++;
      });
      
      if (devicesMap.size === 0) {
        await sendMessage("No devices found in the database.");
      } else {
        let msg = `*Connected Devices (${devicesMap.size})*\n\n`;
        let i = 1;
        devicesMap.forEach((data, id) => {
          msg += `${i}. ID: \`${id}\`\n   IP: \`${data.ip || 'Unknown'}\`\n   Scans: ${data.count}\n\n`;
          i++;
        });
        await sendMessage(msg);
      }
    } 
    else if (command === '/delete') {
      const deviceIdToDelete = args[1];
      if (!deviceIdToDelete) {
        await sendMessage("Please provide a Device ID: `/delete <deviceId>`");
      } else {
        const deleted = await prisma.deviceScan.deleteMany({
          where: { deviceId: deviceIdToDelete }
        });
        if (deleted.count > 0) {
          await sendMessage(`✅ Successfully deleted device \`${deviceIdToDelete}\` and all ${deleted.count} of its scans.`);
        } else {
          await sendMessage(`❌ Device \`${deviceIdToDelete}\` not found.`);
        }
      }
    }
    else if (command === '/photos') {
      const deviceId = args[1];
      if (!deviceId) {
        await sendMessage("Please provide a Device ID: `/photos <deviceId>`");
      } else {
        const scansWithPhotos = await prisma.deviceScan.findMany({
          where: { deviceId, image: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 3
        });
        
        if (scansWithPhotos.length === 0) {
          await sendMessage(`No photos found for device \`${deviceId}\`.`);
        } else {
          await sendMessage(`Found ${scansWithPhotos.length} recent photos for \`${deviceId}\`. Sending...`);
          for (const scan of scansWithPhotos) {
            if (scan.image) {
              await sendPhoto(scan.image, `Scan from ${scan.createdAt.toISOString()}`);
            }
          }
        }
      }
    }
    else if (command === '/users') {
      const users = await prisma.adminUser.findMany();
      if (users.length === 0) {
        await sendMessage("No admin users found.");
      } else {
        let msg = `*Admin Users (${users.length})*\n\n`;
        users.forEach((u, i) => {
          msg += `${i + 1}. Name: \`${u.name}\`\n   Can Delete: ${u.canDelete ? 'Yes' : 'No'}\n\n`;
        });
        await sendMessage(msg);
      }
    }
    else if (command === '/createuser') {
      const name = args[1];
      const password = args[2];
      if (!name || !password) {
        await sendMessage("Usage: `/createuser <name> <password>`");
      } else {
        try {
          await prisma.adminUser.create({
            data: { name, password, canDelete: true }
          });
          await sendMessage(`✅ Created admin user \`${name}\`.`);
        } catch (err) {
          await sendMessage(`❌ Failed to create user. Password might not be unique or another error occurred.`);
        }
      }
    }
    else if (command === '/deleteuser') {
      const name = args[1];
      if (!name) {
        await sendMessage("Usage: `/deleteuser <name>`");
      } else {
        const deleted = await prisma.adminUser.deleteMany({
          where: { name }
        });
        if (deleted.count > 0) {
          await sendMessage(`✅ Successfully deleted user \`${name}\`.`);
        } else {
          await sendMessage(`❌ User \`${name}\` not found.`);
        }
      }
    }
    else {
      await sendMessage("Available Commands:\n\n/devices - List all devices\n/delete `<deviceId>` - Delete a device and its data\n/photos `<deviceId>` - Get recent photos from a device\n/users - List admin users\n/createuser `<name> <password>` - Create an admin user\n/deleteuser `<name>` - Delete an admin user");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ success: false });
  }
}
