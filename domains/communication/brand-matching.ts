type BrandCandidate = { id: string; company_name: string };
type ContactCandidate = { brand_id: string; email: string | null };

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchBrandFromSender(
  senderEmail: string,
  senderName: string | null,
  brands: BrandCandidate[],
  contacts: ContactCandidate[],
): BrandCandidate | null {
  const contactMatch = contacts.find(
    (contact) => contact.email?.toLowerCase() === senderEmail.toLowerCase(),
  );
  if (contactMatch) {
    return brands.find((brand) => brand.id === contactMatch.brand_id) ?? null;
  }

  const domain = senderEmail.split("@")[1]?.split(".")[0];
  if (domain) {
    const normalizedDomain = normalize(domain);
    const domainMatch = brands.find((brand) => {
      const normalizedName = normalize(brand.company_name);
      return normalizedName.includes(normalizedDomain) || normalizedDomain.includes(normalizedName);
    });
    if (domainMatch) return domainMatch;
  }

  if (senderName) {
    const normalizedSender = normalize(senderName);
    return brands.find((brand) => {
      const normalizedName = normalize(brand.company_name);
      return normalizedName.includes(normalizedSender) || normalizedSender.includes(normalizedName);
    }) ?? null;
  }

  return null;
}
