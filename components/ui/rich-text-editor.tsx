"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold,
  Code,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Trash2,
  Underline as UnderlineIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  noteId: string;
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  noteId,
  content,
  onChange,
  placeholder = "Fang an zu schreiben…",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: { class: "outline-none" },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Reset editor content when switching to a different note
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(content || "<p></p>");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  if (!editor) return null;

  function btn(active: boolean) {
    return cn(
      "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/6 hover:text-foreground",
      active && "bg-black/8 text-foreground",
    );
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL eingeben", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-border px-3 py-1.5">
        <button type="button" title="Fett (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}>
          <Bold className="size-3.5" />
        </button>
        <button type="button" title="Kursiv (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}>
          <Italic className="size-3.5" />
        </button>
        <button type="button" title="Unterstrichen (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive("underline"))}>
          <UnderlineIcon className="size-3.5" />
        </button>

        <div className="mx-1.5 h-4 w-px bg-border" />

        <button type="button" title="Aufzählung" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))}>
          <List className="size-3.5" />
        </button>
        <button type="button" title="Nummerierte Liste" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))}>
          <ListOrdered className="size-3.5" />
        </button>

        <div className="mx-1.5 h-4 w-px bg-border" />

        <button type="button" title="Zitat" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))}>
          <Quote className="size-3.5" />
        </button>
        <button type="button" title="Code" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive("code"))}>
          <Code className="size-3.5" />
        </button>
        <button type="button" title="Link setzen" onClick={setLink} className={btn(editor.isActive("link"))}>
          <LinkIcon className="size-3.5" />
        </button>

        <div className="ml-auto">
          <button
            type="button"
            title="Inhalt leeren"
            onClick={() => { editor.chain().focus().clearContent().run(); onChange(""); }}
            className={cn(btn(false), "hover:bg-red-50 hover:text-red-600")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className={cn(
          "flex-1 overflow-auto",
          // ProseMirror base
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:px-5 [&_.ProseMirror]:py-4 [&_.ProseMirror]:text-sm [&_.ProseMirror]:leading-relaxed [&_.ProseMirror]:text-foreground",
          // Placeholder
          "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/50 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0",
          // Inline marks
          "[&_.ProseMirror_strong]:font-semibold",
          "[&_.ProseMirror_em]:italic",
          "[&_.ProseMirror_u]:underline",
          "[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2",
          // Code
          "[&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-xs",
          "[&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-xs",
          // Lists
          "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:space-y-0.5",
          "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:space-y-0.5",
          // Blockquote
          "[&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_blockquote]:italic",
          // Paragraphs
          "[&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p:last-child]:mb-0",
          "[&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-2",
          "[&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-2",
          "[&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-1.5",
        )}
      />
    </div>
  );
}
