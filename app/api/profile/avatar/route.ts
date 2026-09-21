import { getAuthContext, toErrorResponse } from "@/domains/auth";
import { avatarConfigSchema } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { userId } = await getAuthContext(supabase);
    const body = await request.json();
    const avatarConfig = avatarConfigSchema.parse(body.avatar_config);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_config: avatarConfig })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return Response.json({ avatar_config: avatarConfig });
  } catch (error) {
    return toErrorResponse(error);
  }
}
