export const QueryKeys = {
  inbox: {
    all: () => ["inbox"] as const,
    list: () => ["inbox", "list"] as const,
    light: () => ["inbox", "light"] as const,
    detail: (id: string) => ["inbox", "detail", id] as const,
    conversation: (id: string) => ["inbox", "conversation", id] as const,
  },
  creators: {
    all: () => ["creators"] as const,
    list: () => ["creators", "list"] as const,
    light: () => ["creators", "light"] as const,
    detail: (id: string) => ["creators", "detail", id] as const,
    deals: (id: string) => ["creator-deals", id] as const,
    documents: (id: string) => ["creator-documents", id] as const,
  },
  brands: {
    all: () => ["brands"] as const,
    list: () => ["brands", "list"] as const,
  },
  templates: {
    all: () => ["templates"] as const,
    list: () => ["templates", "list"] as const,
  },
  members: {
    list: () => ["agency-users"] as const,
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
  whatsapp: {
    all: () => ["whatsapp"] as const,
    connection: () => ["whatsapp", "connection"] as const,
  },
  todos: {
    all: () => ["todos"] as const,
  },
} as const;
