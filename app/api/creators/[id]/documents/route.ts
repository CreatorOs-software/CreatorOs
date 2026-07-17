import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { serviceClient } from "@/lib/supabase/service";

const BUCKET = "creator-documents";
const SIGNED_URL_TTL = 3600; // 1 hour

type Params = { params: Promise<{ id: string }> };

function storagePath(agencyId: string, creatorId: string, filename: string) {
  return `${agencyId}/${creatorId}/${filename}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-]/g, "_");
}

// GET — list all documents for a creator
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: creatorId } = await params;
    const { agencyId } = await getAuthContext();

    const folder = `${agencyId}/${creatorId}`;
    const { data: objects, error } = await serviceClient.storage
      .from(BUCKET)
      .list(folder, { sortBy: { column: "created_at", order: "desc" } });

    if (error) throw error;

    const files = objects ?? [];

    // Generate signed URLs for all files in parallel
    const withUrls = await Promise.all(
      files.map(async (obj) => {
        const path = `${folder}/${obj.name}`;
        const { data } = await serviceClient.storage
          .from(BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL);
        return {
          id: obj.id ?? obj.name,
          name: obj.metadata?.originalName ?? obj.name,
          size: (obj.metadata?.size as number) ?? 0,
          type: (obj.metadata?.mimetype as string) ?? "",
          url: data?.signedUrl ?? "",
          path,
        };
      })
    );

    return Response.json({ documents: withUrls });
  } catch (e) {
    return toErrorResponse(e);
  }
}

// POST — upload a document (multipart/form-data, field: "file")
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: creatorId } = await params;
    const { agencyId } = await getAuthContext();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = `${timestamp}-${sanitizeFilename(file.name)}`;
    const path = storagePath(agencyId, creatorId, safeName);

    const bytes = await file.arrayBuffer();
    const { error } = await serviceClient.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          size: file.size,
          mimetype: file.type,
        },
      });

    if (error) throw error;

    const { data: signedData } = await serviceClient.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    return Response.json({
      document: {
        id: safeName,
        name: file.name,
        size: file.size,
        type: file.type,
        url: signedData?.signedUrl ?? "",
        path,
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}

// DELETE — remove a document by storage path
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id: creatorId } = await params;
    const { agencyId } = await getAuthContext();

    const { path } = await req.json() as { path: string };
    if (!path) {
      return Response.json({ error: "No path provided" }, { status: 400 });
    }

    // Security: ensure the path belongs to this agency + creator
    const expectedPrefix = `${agencyId}/${creatorId}/`;
    if (!path.startsWith(expectedPrefix)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await serviceClient.storage.from(BUCKET).remove([path]);
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
