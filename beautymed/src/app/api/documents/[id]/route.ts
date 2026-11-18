import { getCurrentUser } from "@/server/auth/session";
import { NotFoundError, toErrorResponse } from "@/server/errors";
import { readDocument } from "@/server/services/verification";

type Context = { params: Promise<{ id: string }> };

/**
 * Private documents (medical licenses, company papers). Only admins get the file (not even its
 * owner). Everyone else, signed in or not, gets the same 404, so nothing reveals that a
 * document exists.
 */
export async function GET(_request: Request, { params }: Context): Promise<Response> {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const doc = user ? await readDocument(user, id) : null;
    if (!doc) throw new NotFoundError();
    // Images open in the browser inside a script-free sandbox. PDFs are downloaded instead,
    // because browsers do not show their PDF viewer inside a sandbox.
    const isPdf = doc.mimeType === "application/pdf";
    return new Response(Buffer.from(doc.bytes), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `${isPdf ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(isPdf ? {} : { "Content-Security-Policy": "default-src 'none'; sandbox" }),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
