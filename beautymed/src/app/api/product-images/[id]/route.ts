import { getCurrentUser } from "@/server/auth/session";
import { NotFoundError, toErrorResponse } from "@/server/errors";
import { readProductImage } from "@/server/services/products";

type Context = { params: Promise<{ id: string }> };

/**
 * Product images. Public only when the product is published and the image may be shown
 * (before/after images need the patient-consent flag). Otherwise 404.
 */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  try {
    const { id } = await params;
    const image = await readProductImage(await getCurrentUser(), id);
    if (!image) throw new NotFoundError();
    return new Response(Buffer.from(image.bytes), {
      headers: {
        "Content-Type": image.mimeType,
        // Publication can be withdrawn at any time, so nothing is cached for long.
        "Cache-Control": image.isPublic ? "public, max-age=300" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
        // Uploaded files are never allowed to run scripts or load anything, even if opened directly.
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
