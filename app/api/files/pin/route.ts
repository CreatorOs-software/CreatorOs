import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { serviceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { agencyId, userId } = await getAuthContext();
    const { path } = (await req.json()) as { path: string };

    const { data: existing } = await serviceClient
      .from("file_pins")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("user_id", userId)
      .eq("file_path", path)
      .maybeSingle();

    if (existing) {
      await serviceClient.from("file_pins").delete().eq("id", existing.id);
      return Response.json({ pinned: false });
    }

    await serviceClient
      .from("file_pins")
      .insert({ agency_id: agencyId, user_id: userId, file_path: path });

    return Response.json({ pinned: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
