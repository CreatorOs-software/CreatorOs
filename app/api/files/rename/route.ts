import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const { agencyId } = await getAuthContext();
    const { path, newName } = (await req.json()) as {
      path: string;
      newName: string;
    };

    const parts = path.split("/");
    parts[parts.length - 1] = newName;
    const newPath = parts.join("/");

    await serviceClient
      .from("files")
      .update({ name: newName, path: newPath, updated_at: new Date().toISOString() })
      .eq("agency_id", agencyId)
      .eq("path", path);

    // Update children paths for directories
    const { data: children } = await serviceClient
      .from("files")
      .select("id, path")
      .eq("agency_id", agencyId)
      .like("path", `${path}/%`);

    for (const child of children ?? []) {
      await serviceClient
        .from("files")
        .update({ path: child.path.replace(path, newPath) })
        .eq("id", child.id);
    }

    return Response.json({ ok: true, path: newPath });
  } catch (e) {
    return toErrorResponse(e);
  }
}
