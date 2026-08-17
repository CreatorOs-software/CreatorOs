import { getAuthContext } from "@/lib/auth-context";
import { serviceClient } from "@/lib/supabase/service";
import { FileManagerClient } from "./file-manager-client";

export default async function FilesPage() {
  const { agencyId } = await getAuthContext();

  const { data: files } = await serviceClient
    .from("files")
    .select("name, path, is_directory, size, updated_at")
    .eq("agency_id", agencyId)
    .order("is_directory", { ascending: false })
    .order("name");

  const initialFiles = (files ?? []).map((f) => ({
    name: f.name,
    isDirectory: f.is_directory,
    path: f.path,
    size: f.size ?? undefined,
    updatedAt: f.updated_at,
  }));

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-1 items-center justify-center">
      <div className="h-[90%] w-[90%]">
        <FileManagerClient initialFiles={initialFiles} />
      </div>
    </div>
  );
}
