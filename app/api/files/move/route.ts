import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { agencyId } = await getAuthContext();
    const { files, destination, operationType } = (await req.json()) as {
      files: Array<{ name: string; path: string; isDirectory: boolean }>;
      destination: { path: string };
      operationType: "copy" | "move";
    };

    const destBase = (destination.path ?? "").replace(/\/+$/, "");

    for (const file of files) {
      const destPath = destBase ? `${destBase}/${file.name}` : `/${file.name}`;

      if (operationType === "move") {
        await serviceClient
          .from("files")
          .update({ path: destPath, updated_at: new Date().toISOString() })
          .eq("agency_id", agencyId)
          .eq("path", file.path);

        if (file.isDirectory) {
          const { data: children } = await serviceClient
            .from("files")
            .select("id, path")
            .eq("agency_id", agencyId)
            .like("path", `${file.path}/%`);

          for (const child of children ?? []) {
            await serviceClient
              .from("files")
              .update({ path: child.path.replace(file.path, destPath) })
              .eq("id", child.id);
          }
        }
      } else {
        // Copy — files only in MVP
        if (!file.isDirectory) {
          const { data: original } = await serviceClient
            .from("files")
            .select("*")
            .eq("agency_id", agencyId)
            .eq("path", file.path)
            .single();

          if (original?.storage_path) {
            const ext = original.storage_path.includes(".")
              ? `.${original.storage_path.split(".").pop()}`
              : "";
            const newStoragePath = `${agencyId}/${crypto.randomUUID()}${ext}`;

            await serviceClient.storage
              .from("agency-files")
              .copy(original.storage_path, newStoragePath);

            await serviceClient.from("files").insert({
              agency_id: agencyId,
              name: original.name,
              path: destPath,
              is_directory: false,
              size: original.size,
              storage_path: newStoragePath,
            });
          }
        }
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
