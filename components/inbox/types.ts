import type { ReactNode } from "react";

export type Tag = {
  id: string;
  name: string;
};

export type Sender = {
  name: string;
  email: string;
};

export type DemoMessage = {
  id: string;
  threadId: string;
  tags: Tag[];
  title: string;
  body: string;
  receivedOn: string;
  sender: Sender;
  unread: boolean;
  subject: string;
  totalReplies: number;
  decodedBody: string;
  starred?: boolean;
};

export type Category = {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
  tagId?: string;
};

export type Folder = "inbox" | "drafts" | "sent" | "archive" | "spam" | "bin";
