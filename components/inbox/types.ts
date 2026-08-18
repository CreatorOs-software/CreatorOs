import type { ReactNode } from "react";

// Real domain types — single source of truth
export type {
  EmailThread as Thread,
  InboxIntegration as Integration,
  InboxCreator as Creator,
  InboxPageData as InboxData,
  ThreadPatch,
} from "@/domains/communication";

// UI-only types
export type Category = {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
};

export type Folder = "inbox" | "drafts" | "sent" | "archive" | "spam" | "bin";
