export const QueryKeys = {
  inbox: ["inbox"] as const,
  creators: ["creators"] as const,
  integrations: ["integrations"] as const,
  events: (from: string, to: string) => ["events", from, to] as const,
} as const;
