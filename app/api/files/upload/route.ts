import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { agencyId } = await getAuthContext();
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const folderPath = (formData.get("path") as string | null) ?? "";

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
    const storagePath = `${agencyId}/${crypto.randomUUID()}${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceClient.storage
      .from("agency-files")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const normalizedFolder = folderPath.replace(/\/+$/, "");
    const userPath = normalizedFolder
      ? `${normalizedFolder}/${file.name}`
      : `/${file.name}`;

    const { data, error } = await serviceClient
      .from("files")
      .insert({
        agency_id: agencyId,
        name: file.name,
        path: userPath,
        is_directory: false,
        size: file.size,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (error) {
      await serviceClient.storage.from("agency-files").remove([storagePath]);
      throw error;
    }

    return Response.json({
      name: data.name,
      isDirectory: false,
      path: data.path,
      size: data.size,
      updatedAt: data.updated_at,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
