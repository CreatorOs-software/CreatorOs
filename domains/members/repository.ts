import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePermissions } from "@/domains/auth/permissions";
import type { AgencyMember, AgencyInvitation, CreateInvitationInput } from "./types";
import type { Role } from "@/domains/auth/types";

export const MemberRepository = {
  async findMembers(supabase: SupabaseClient, agencyId: string): Promise<AgencyMember[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, initials, color, role, permissions, created_at")
      .eq("agency_id", agencyId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...row,
      role: (row.role === "admin" ? "admin" : "member") as Role,
      permissions: normalizePermissions((row.permissions as Record<string, unknown>) ?? {}),
    }));
  },

  async updateMember(
    supabase: SupabaseClient,
    memberId: string,
    patch: { role?: Role; permissions?: Record<string, boolean> },
  ): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async findInvitations(supabase: SupabaseClient, agencyId: string): Promise<AgencyInvitation[]> {
    const { data, error } = await supabase
      .from("agency_invitations")
      .select("*")
      .eq("agency_id", agencyId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...row,
      role: (row.role === "admin" ? "admin" : "member") as Role,
      permissions: normalizePermissions((row.permissions as Record<string, unknown>) ?? {}),
    }));
  },

  async createInvitation(
    supabase: SupabaseClient,
    agencyId: string,
    invitedBy: string,
    input: CreateInvitationInput,
  ): Promise<AgencyInvitation> {
    const { data, error } = await supabase
      .from("agency_invitations")
      .insert({
        agency_id: agencyId,
        invited_by: invitedBy,
        email: input.email,
        role: input.role,
        permissions: input.permissions,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      ...data,
      role: (data.role === "admin" ? "admin" : "member") as Role,
      permissions: normalizePermissions((data.permissions as Record<string, unknown>) ?? {}),
    };
  },

  async deleteInvitation(supabase: SupabaseClient, invitationId: string): Promise<void> {
    const { error } = await supabase
      .from("agency_invitations")
      .delete()
      .eq("id", invitationId);
    if (error) throw new Error(error.message);
  },

  async findInvitationByToken(
    supabase: SupabaseClient,
    token: string,
  ): Promise<AgencyInvitation | null> {
    const { data } = await supabase
      .from("agency_invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();
    if (!data) return null;
    return {
      ...data,
      role: (data.role === "admin" ? "admin" : "member") as Role,
      permissions: normalizePermissions((data.permissions as Record<string, unknown>) ?? {}),
    };
  },

  async acceptInvitation(
    supabase: SupabaseClient,
    token: string,
    userId: string,
  ): Promise<void> {
    const invitation = await MemberRepository.findInvitationByToken(supabase, token);
    if (!invitation) throw new Error("Invitation not found or expired");

    // Move user into the invited agency
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        agency_id: invitation.agency_id,
        role: invitation.role,
        permissions: invitation.permissions,
      })
      .eq("id", userId);
    if (profileError) throw new Error(profileError.message);

    // Mark invitation as accepted
    await supabase
      .from("agency_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("token", token);
  },
};
