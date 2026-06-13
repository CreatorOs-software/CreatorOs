import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/domains/auth/service";
import { MemberRepository } from "./repository";
import type { CreateInvitationInput } from "./types";

export const MemberService = {
  async getMembers() {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return MemberRepository.findMembers(supabase, agencyId);
  },

  async getInvitations() {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return MemberRepository.findInvitations(supabase, agencyId);
  },

  async createInvitation(input: CreateInvitationInput) {
    const supabase = await createClient();
    const { agencyId, userId, role } = await getAuthContext(supabase);
    if (role !== "admin") throw new Error("Only admins can invite members");
    return MemberRepository.createInvitation(supabase, agencyId, userId, input);
  },

  async deleteInvitation(invitationId: string) {
    const supabase = await createClient();
    const { role } = await getAuthContext(supabase);
    if (role !== "admin") throw new Error("Only admins can manage invitations");
    return MemberRepository.deleteInvitation(supabase, invitationId);
  },

  async acceptInvitation(token: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return MemberRepository.acceptInvitation(supabase, token, user.id);
  },
};
