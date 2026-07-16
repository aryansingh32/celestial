import { createServerFn } from "@tanstack/react-start";
import { PrismaClient } from "@prisma/client";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";

const prisma = new PrismaClient();

export const collectTelemetry = createServerFn({ method: "POST" })
  .validator((data: {
    image: string;
    userAgent: string;
    language: string;
    screenResolution: string;
    hardwareConcurrency: number;
    deviceMemory: number;
    timezone?: string;
    touchSupport?: boolean;
    connectionType?: string;
    // User-provided details
    userName?: string;
    birthDate?: string;
    birthState?: string;
    birthCity?: string;
    birthTime?: string;
    // GPS location (opted-in)
    latitude?: number;
    longitude?: number;
    // Reading result
    reading?: Record<string, unknown>;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const publicIp = getRequestIP() || getRequestHeader("x-forwarded-for") || "unknown";
      const referer = getRequestHeader("referer") || "unknown";

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
      return { success: true };
    } catch (error) {
      console.error(error);
      return { error: "Failed to collect" };
    }
  });
