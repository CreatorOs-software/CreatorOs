import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { NoteService } from "@/domains/notes";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().default(""),
  content: z.string().default(""),
  creator_id: z.string().uuid().nullable().optional(),
  brand_id: z.string().uuid().nullable().optional(),
});

export async function GET() {
  try {
    const notes = await NoteService.listNotes();
    return Response.json({ notes });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const note = await NoteService.createNote(parsed.data);
    return Response.json({ note }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
