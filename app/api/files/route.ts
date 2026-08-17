import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { agencyId, userId } = await getAuthContext();

    const [{ data: files, error }, { data: pins }] = await Promise.all([
      serviceClient
        .from("files")
        .select("name, path, is_directory, size, updated_at")
        .eq("agency_id", agencyId)
        .order("is_directory", { ascending: false })
        .order("name"),
      serviceClient
        .from("file_pins")
        .select("file_path")
        .eq("agency_id", agencyId)
        .eq("user_id", userId),
    ]);

    if (error) throw error;

    const pinnedPaths = new Set((pins ?? []).map((p) => p.file_path));

    const result = (files ?? []).map((f) => ({
      name: f.name,
      isDirectory: f.is_directory,
      path: f.path,
      size: f.size ?? undefined,
      updatedAt: f.updated_at,
      pinned: pinnedPaths.has(f.path),
    }));

    return Response.json({ files: result });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { agencyId } = await getAuthContext();
    const { files } = (await req.json()) as {
      files: Array<{ path: string; isDirectory: boolean }>;
    };

    const allPaths = files.map((f) => f.path);
    const dirPaths = files.filter((f) => f.isDirectory).map((f) => f.path);

    // Collect storage paths for direct files
    const { data: dbFiles } = await serviceClient
      .from("files")
      .select("storage_path")
      .eq("agency_id", agencyId)
      .in("path", allPaths)
      .eq("is_directory", false);

    const storagePaths = (dbFiles ?? [])
      .map((f) => f.storage_path)
      .filter(Boolean) as string[];

    // Collect storage paths for files inside deleted directories
    for (const dirPath of dirPaths) {
      const { data: inner } = await serviceClient
        .from("files")
        .select("storage_path")
        .eq("agency_id", agencyId)
        .like("path", `${dirPath}/%`)
        .eq("is_directory", false);
      storagePaths.push(...(inner ?? []).map((f) => f.storage_path).filter(Boolean) as string[]);
    }

    if (storagePaths.length > 0) {
      await serviceClient.storage.from("agency-files").remove(storagePaths);
    }

    // Delete DB rows (files + their children)
    await serviceClient.from("files").delete().eq("agency_id", agencyId).in("path", allPaths);

    for (const dirPath of dirPaths) {
      await serviceClient
        .from("files")
        .delete()
        .eq("agency_id", agencyId)
        .like("path", `${dirPath}/%`);
    }

    // Clean up pins
    await serviceClient
      .from("file_pins")
      .delete()
      .eq("agency_id", agencyId)
      .in("file_path", allPaths);

    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
