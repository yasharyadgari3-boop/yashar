import { getCurrentUser } from "@/server/auth/session";
import { NotFoundError, toErrorResponse } from "@/server/errors";
import { readDocument } from "@/server/services/verification";

type Context = { params: Promise<{ id: string }> };

/**
 * Private documents (medical licenses, company papers). Only the owner and admins get the
 * file. Everyone else, signed in or not, gets the same 404, so nothing reveals that a
 * document exists.
 */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const doc = user ? await readDocument(user, id) : null;
    if (!doc) throw new NotFoundError();
    return new Response(Buffer.from(doc.bytes), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
