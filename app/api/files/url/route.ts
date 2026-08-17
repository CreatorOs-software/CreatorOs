import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { agencyId } = await getAuthContext();
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
      return Response.json({ error: "Path required" }, { status: 400 });
    }

    const { data: file } = await serviceClient
      .from("files")
      .select("storage_path, name")
      .eq("agency_id", agencyId)
      .eq("path", path)
      .single();

    if (!file?.storage_path) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const { data } = await serviceClient.storage
      .from("agency-files")
      .createSignedUrl(file.storage_path, 3600, {
        download: file.name,
      });

    return Response.json({ url: data?.signedUrl ?? null });
  } catch (e) {
    return toErrorResponse(e);
  }
}
