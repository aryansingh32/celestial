import { getDriveImageStream } from '@/lib/gdrive';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.length < 10) {
      return new Response("Invalid ID", { status: 400 });
    }

    const result = await getDriveImageStream(id);
    if (!result) {
      return new Response("Image not found", { status: 404 });
    }

    return new Response(result.stream, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error: any) {
    console.error("[Image Proxy] Error:", error.message);
    return new Response("Image not found", { status: 404 });
  }
}
