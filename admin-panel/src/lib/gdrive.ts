// Use the low-level JWT auth approach to avoid duplicate google-auth-library version conflicts
import path from "path";
import { Readable } from "stream";
import { readFileSync } from "fs";

const FOLDER_ID = "1Co3cKzEpn9aiGtNC9pKZWTzwGJEqNMlC";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const FILE_META_URL = "https://www.googleapis.com/drive/v3/files";

let cachedToken: { token: string; expiry: number } | null = null;

function getCredentials() {
  const keypath = path.join(process.cwd(), "gcp-service-account.json");
  const raw = readFileSync(keypath, "utf-8");
  return JSON.parse(raw) as {
    client_email: string;
    private_key: string;
  };
}

async function createJWT(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })).toString("base64url");

  const signingInput = `${header}.${payload}`;

  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(privateKey, "base64url");

  return `${signingInput}.${signature}`;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiry > Date.now()) {
    return cachedToken.token;
  }

  const creds = getCredentials();
  const jwt = await createJWT(creds.client_email, creds.private_key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiry: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export async function uploadImageToDrive(base64Data: string, filename: string): Promise<string | null> {
  try {
    const token = await getAccessToken();

    // Strip data URL prefix
    const base64Str = base64Data.replace(/^data:[^;]+;base64,/, "");
    const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const imageBuffer = Buffer.from(base64Str, "base64");

    if (imageBuffer.length < 100) {
      console.warn("[Drive] Image too small, skipping.");
      return null;
    }

    // Build multipart form body manually
    const boundary = "celestial_upload_boundary";
    const metadataJSON = JSON.stringify({ name: filename, parents: [FOLDER_ID] });

    const metaPart = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataJSON}\r\n`
    );
    const imagePart = Buffer.from(
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const closing = Buffer.from(`\r\n--${boundary}--`);

    const body = Buffer.concat([metaPart, imagePart, imageBuffer, closing]);

    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Drive] Upload failed:", res.status, errText);
      return null;
    }

    const data = await res.json() as { id?: string };
    if (data.id) {
      console.log(`[Drive] Uploaded: ${filename} => ${data.id}`);
    }
    return data.id || null;
  } catch (error) {
    console.error("[Drive] Upload error:", error);
    return null;
  }
}

export async function getDriveImageStream(fileId: string): Promise<{ stream: ReadableStream; mimeType: string } | null> {
  try {
    const token = await getAccessToken();

    // Get metadata
    const metaRes = await fetch(`${FILE_META_URL}/${fileId}?fields=mimeType,name`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json() as { mimeType?: string };
    const mimeType = meta.mimeType || "image/jpeg";

    // Download the image
    const imgRes = await fetch(`${FILE_META_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!imgRes.ok) return null;

    return { stream: imgRes.body!, mimeType };
  } catch (error) {
    console.error("[Drive] Download error:", error);
    return null;
  }
}
