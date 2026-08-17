import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { agencyId } = await getAuthContext();
    const { name, parentPath } = (await req.json()) as {
      name: string;
      parentPath: string;
    };

    const normalized = (parentPath ?? "").replace(/\/+$/, "");
    const folderPath = normalized ? `${normalized}/${name}` : `/${name}`;

    const { data, error } = await serviceClient
      .from("files")
      .insert({
        agency_id: agencyId,
        name,
        path: folderPath,
        is_directory: true,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      name: data.name,
      isDirectory: true,
      path: data.path,
      updatedAt: data.updated_at,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
