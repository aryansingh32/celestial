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
    const envAllowedChatIds = process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.split(',').map(id => id.trim()) : [];
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

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
      await sendMessage(`Welcome to *Network Overseer Bot*.\n\nYour Chat ID is: \`${chatId}\`\n\nTo access bot commands, type \`/login <PASSWORD>\`. You can use the Super Admin password or your Web Panel password.`);
      return NextResponse.json({ success: true });
    }

    // Process login command before checking authorization
    const args = text.split(' ');
    const command = args[0].toLowerCase();

    if (command === '/login') {
      const password = args[1];
      if (!password) {
        await sendMessage("Usage: `/login <password>`");
        return NextResponse.json({ success: true });
      }
      
      let valid = password === superAdminPassword;
      if (!valid) {
        // Check if password belongs to an AdminUser
        const admin = await prisma.adminUser.findUnique({ where: { password } });
        if (admin) valid = true;
      }

      if (valid) {
        try {
          await prisma.telegramUser.upsert({
            where: { chatId },
            update: { username: body.message.chat.username || "Unknown" },
            create: { chatId, username: body.message.chat.username || "Unknown" }
          });
          await sendMessage("✅ Access granted! You are now authorized to use this bot and will receive new device notifications.\n\nType `/help` to see available commands.");
        } catch (err) {
          await sendMessage("❌ Database error while linking account.");
          console.error(err);
        }
      } else {
        await sendMessage("❌ Incorrect password.");
      }
      return NextResponse.json({ success: true });
    }

    // Check Authorization
    let isAuthorized = envAllowedChatIds.includes(chatId);
    if (!isAuthorized) {
      const dbUser = await prisma.telegramUser.findUnique({ where: { chatId } });
      if (dbUser) isAuthorized = true;
    }

    if (!isAuthorized) {
      await sendMessage("Unauthorized. Your Chat ID is not registered. Use `/login <password>` to gain access.");
      return NextResponse.json({ success: true });
    }

    if (command === '/devices') {
      const scans = await prisma.deviceScan.findMany({
        select: { deviceId: true, publicIp: true, userAgent: true, userName: true }
      });
      
      const devicesMap = new Map();
      scans.forEach(scan => {
        if (!scan.deviceId) return;
        if (!devicesMap.has(scan.deviceId)) {
          devicesMap.set(scan.deviceId, { count: 0, ip: scan.publicIp, ua: scan.userAgent, name: scan.userName });
        }
        devicesMap.get(scan.deviceId).count++;
        if (scan.userName) devicesMap.get(scan.deviceId).name = scan.userName;
      });
      
      if (devicesMap.size === 0) {
        await sendMessage("No devices found in the database.");
      } else {
        let msg = `*Connected Devices (${devicesMap.size})*\n\n`;
        let i = 1;
        devicesMap.forEach((data, id) => {
          const shortId = id.substring(0, 8);
          msg += `${i}. Name: *${data.name || 'Unknown'}*\n   IP: \`${data.ip || 'Unknown'}\`\n   ID: \`${shortId}\`\n   Scans: ${data.count}\n\n`;
          i++;
        });
        await sendMessage(msg);
      }
    } 
    else if (command === '/delete') {
      let deviceIdToDelete = args[1];
      if (!deviceIdToDelete) {
        await sendMessage("Please provide a Device ID: `/delete <shortId>`");
      } else {
        if (deviceIdToDelete.length < 20) {
          const scan = await prisma.deviceScan.findFirst({ where: { deviceId: { startsWith: deviceIdToDelete } } });
          if (scan && scan.deviceId) deviceIdToDelete = scan.deviceId;
        }

        const deleted = await prisma.deviceScan.deleteMany({
          where: { deviceId: deviceIdToDelete }
        });
        if (deleted.count > 0) {
          await sendMessage(`✅ Successfully deleted device \`${deviceIdToDelete.substring(0, 8)}...\` and all ${deleted.count} of its scans.`);
        } else {
          await sendMessage(`❌ Device starting with \`${deviceIdToDelete}\` not found.`);
        }
      }
    }
    else if (command === '/photos') {
      let deviceId = args[1];
      if (!deviceId) {
        await sendMessage("Please provide a Device ID: `/photos <shortId>`");
      } else {
        if (deviceId.length < 20) {
          const scan = await prisma.deviceScan.findFirst({ where: { deviceId: { startsWith: deviceId } } });
          if (scan && scan.deviceId) deviceId = scan.deviceId;
        }

        const scansWithPhotos = await prisma.deviceScan.findMany({
          where: { deviceId, image: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 3
        });
        
        if (scansWithPhotos.length === 0) {
          await sendMessage(`No photos found for device \`${deviceId.substring(0, 8)}...\`.`);
        } else {
          await sendMessage(`Found ${scansWithPhotos.length} recent photos for \`${deviceId.substring(0, 8)}...\`. Sending...`);
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
      await sendMessage("Available Commands:\n\n/devices - List all devices (shows short ID and name)\n/delete `<shortId>` - Delete a device and its data\n/photos `<shortId>` - Get recent photos from a device\n/users - List admin users\n/createuser `<name> <password>` - Create an admin user\n/deleteuser `<name>` - Delete an admin user");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ success: false });
  }
}
