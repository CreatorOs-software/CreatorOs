import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Brand,
  BrandContact,
  BrandPatch,
  ContactPatch,
  CreatorRef,
  DealRef,
  AnfrageRef,
} from "./types";

export const BrandRepository = {
  async findAll(supabase: SupabaseClient, agencyId: string) {
    const [brandsRes, dealsRes, anfrageRes] = await Promise.all([
      supabase
        .from("brands")
        .select("id, company_name, short_code, color, industry, notes")
        .eq("agency_id", agencyId)
        .order("company_name"),
      supabase
        .from("deals")
        .select("id, brand_id, budget, status, payment_items, created_at")
        .eq("agency_id", agencyId),
      supabase
        .from("anfragen")
        .select("id, brand_id")
        .eq("agency_id", agencyId)
        .not("brand_id", "is", null),
    ]);

    if (brandsRes.error) throw brandsRes.error;
    if (dealsRes.error) throw dealsRes.error;
    if (anfrageRes.error) throw anfrageRes.error;

    return {
      brands: brandsRes.data ?? [],
      deals: dealsRes.data ?? [],
      anfragen: anfrageRes.data ?? [],
    };
  },

  async findById(supabase: SupabaseClient, id: string, agencyId: string) {
    const [brandRes, contactsRes, dealsRes, anfrageRes, creatorsRes] = await Promise.all([
      supabase.from("brands").select("*").eq("id", id).eq("agency_id", agencyId).single(),
      supabase.from("brand_contacts").select("*").eq("brand_id", id).order("created_at"),
      supabase
        .from("deals")
        .select(
          "id, title, budget, status, deadline, campaign_type, usage_rights, exclusivity, payment_items, created_at, creator_id, creators(id, full_name, initials, color)",
        )
        .eq("brand_id", id)
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("anfragen")
        .select(
          "id, format, budget_requested, status, rejection_reason, notes, created_at, creator_id, creators(id, full_name, initials, color)",
        )
        .eq("brand_id", id)
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("creators")
        .select("id, full_name, initials, color")
        .eq("agency_id", agencyId)
        .order("full_name"),
    ]);

    if (brandRes.error) throw brandRes.error;
    if (contactsRes.error) throw contactsRes.error;
    if (dealsRes.error) throw dealsRes.error;
    if (anfrageRes.error) throw anfrageRes.error;
    if (creatorsRes.error) throw creatorsRes.error;

    return {
      brand: brandRes.data as Brand,
      contacts: (contactsRes.data ?? []) as BrandContact[],
      deals: (dealsRes.data ?? []) as unknown as DealRef[],
      anfragen: (anfrageRes.data ?? []) as unknown as AnfrageRef[],
      allCreators: (creatorsRes.data ?? []) as CreatorRef[],
    };
  },

  async create(
    supabase: SupabaseClient,
    agencyId: string,
    data: { company_name: string; short_code: string; color: string; industry?: string | null },
  ): Promise<Brand> {
    const { data: brand, error } = await supabase
      .from("brands")
      .insert({ agency_id: agencyId, ...data })
      .select("id, company_name, short_code, color, industry, notes")
      .single();
    if (error) throw error;
    return brand as Brand;
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    patch: BrandPatch,
  ): Promise<Brand> {
    const { data: brand, error } = await supabase
      .from("brands")
      .update(patch)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select("*")
      .single();
    if (error) throw error;
    return brand as Brand;
  },

  async remove(supabase: SupabaseClient, id: string, agencyId: string): Promise<void> {
    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },

  async findContacts(supabase: SupabaseClient, brandId: string): Promise<BrandContact[]> {
    const { data, error } = await supabase
      .from("brand_contacts")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as BrandContact[];
  },

  async createContact(
    supabase: SupabaseClient,
    brandId: string,
    agencyId: string,
    data: { name: string; role?: string | null; email?: string | null; phone?: string | null },
  ): Promise<BrandContact> {
    const { data: contact, error } = await supabase
      .from("brand_contacts")
      .insert({ brand_id: brandId, agency_id: agencyId, ...data })
      .select("*")
      .single();
    if (error) throw error;
    return contact as BrandContact;
  },

  async updateContact(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    patch: ContactPatch,
  ): Promise<BrandContact> {
    const { data: contact, error } = await supabase
      .from("brand_contacts")
      .update(patch)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select("*")
      .single();
    if (error) throw error;
    return contact as BrandContact;
  },

  async removeContact(supabase: SupabaseClient, id: string, agencyId: string): Promise<void> {
    const { error } = await supabase
      .from("brand_contacts")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },

  async assertBrandOwnership(
    supabase: SupabaseClient,
    brandId: string,
    agencyId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("agency_id", agencyId)
      .single();
    if (error) throw new Error("Brand not found");
  },
};
