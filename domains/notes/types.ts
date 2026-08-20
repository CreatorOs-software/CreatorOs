export type Note = {
  id: string;
  title: string;
  content: string;
  creator_id: string | null;
  brand_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteCreateInput = {
  title?: string;
  content?: string;
  creator_id?: string | null;
  brand_id?: string | null;
};

export type NotePatch = {
  title?: string;
  content?: string;
  creator_id?: string | null;
  brand_id?: string | null;
};
