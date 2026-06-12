export const QueryKeys = {
  inbox: {
    all: () => ["inbox"] as const,
    list: () => ["inbox", "list"] as const,
    light: () => ["inbox", "light"] as const,
    detail: (id: string) => ["inbox", "detail", id] as const,
  },
  creators: {
    all: () => ["creators"] as const,
    list: () => ["creators", "list"] as const,
    light: () => ["creators", "light"] as const,
    detail: (id: string) => ["creators", "detail", id] as const,
  },
  events: {
    all: () => ["events"] as const,
    range: (from: string, to: string) => ["events", "range", from, to] as const,
    light: (from: string, to: string) => ["events", "light", from, to] as const,
  },
  integrations: {
    all: () => ["integrations"] as const,
    list: () => ["integrations", "list"] as const,
  },
} as const;
