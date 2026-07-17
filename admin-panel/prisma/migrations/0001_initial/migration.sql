-- CreateTable
CREATE TABLE IF NOT EXISTS "DeviceScan" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT,
    "publicIp" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "language" TEXT,
    "screenResolution" TEXT,
    "timezone" TEXT,
    "installedFonts" TEXT,
    "canvasFingerprint" TEXT,
    "webglFingerprint" TEXT,
    "audioFingerprint" TEXT,
    "hardwareConcurrency" INTEGER,
    "deviceMemory" INTEGER,
    "touchSupport" BOOLEAN,
    "browserPlugins" TEXT,
    "batteryLevel" DOUBLE PRECISION,
    "connectionType" TEXT,
    "userName" TEXT,
    "birthDate" TEXT,
    "birthState" TEXT,
    "birthCity" TEXT,
    "birthTime" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "neighborhoodReading" JSONB,
    "image" TEXT,
    "reading" JSONB,

    CONSTRAINT "DeviceScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DeviceCommand" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DeviceShare" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TelegramUser" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "username" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_password_key" ON "AdminUser"("password");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceShare_adminUserId_deviceId_key" ON "DeviceShare"("adminUserId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramUser_chatId_key" ON "TelegramUser"("chatId");

-- AddForeignKey
ALTER TABLE "DeviceShare" ADD CONSTRAINT "DeviceShare_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
