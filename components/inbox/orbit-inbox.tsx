"use client";

import { Inbox, RefreshCcw, Search } from "lucide-react";
import { useState } from "react";
import demoData from "./demo.json";
import { WorkPanel } from "./work-panel";
import { InboxSidebar } from "./inbox-sidebar";
import { CategorySelect } from "./category-select";
import { ThreadItem } from "./thread-item";
import { EmailDetailPanel, EmptyState } from "./email-detail-panel";
import { CATEGORIES } from "./constants";
import type { DemoMessage, Folder } from "./types";

export function OrbitInbox() {
  const [messages, setMessages] = useState<DemoMessage[]>(
    demoData.map((m) => ({ ...m, starred: false })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState("important");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [workPanelOpen, setWorkPanelOpen] = useState(true);

  const inboxUnread = messages.filter((m) => m.unread).length;

  const filtered = messages.filter((m) => {
    if (folder !== "inbox") return false;

    const matchesSearch =
      !search ||
      m.sender.name.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase()) ||
      m.body.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (category === "all") return true;
    if (category === "unread") return m.unread;

    const cat = CATEGORIES.find((c) => c.id === category);
    if (cat?.tagId) return m.tags.some((t) => t.id === cat.tagId);
    return true;
  });

  const selectedIndex = filtered.findIndex((m) => m.id === selectedId);
  const selected = filtered.find((m) => m.id === selectedId) ?? null;

  function patchMessage(id: string, patch: Partial<DemoMessage>) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function handleSelect(m: DemoMessage) {
    setSelectedId(m.id);
    if (m.unread) patchMessage(m.id, { unread: false });
  }

  function handleStar(id: string) {
    const m = messages.find((x) => x.id === id);
    if (m) patchMessage(id, { starred: !m.starred });
  }

  function handleDelete(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleFolderChange(f: Folder) {
    setFolder(f);
    setSelectedId(null);
    setSearch("");
  }

  return (
    <div className="flex h-full min-w-0 gap-2">
      {/* Sidebar */}
      <InboxSidebar
        folder={folder}
        unreadCount={inboxUnread}
        onFolderChange={handleFolderChange}
      />

      {/* Thread list */}
      <div className="flex w-95 shrink-0 flex-col overflow-hidden rounded-2xl border border-[#E7E7E7] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E7E7E7] px-5 py-3">
          <span className="text-sm font-semibold capitalize">{folder}</span>
          <button className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted">
            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 pb-2 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 w-full rounded-lg bg-muted pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground/20"
            />
          </div>
        </div>

        {folder === "inbox" && (
          <div className="px-5 pb-3">
            <CategorySelect category={category} onCategory={setCategory} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-20" />
              <p className="text-sm">
                {folder !== "inbox"
                  ? "Wird im nächsten Schritt verbunden"
                  : search
                    ? "No results found"
                    : "It's empty here"}
              </p>
            </div>
          ) : (
            filtered.map((m) => (
              <ThreadItem
                key={m.id}
                message={m}
                isSelected={selectedId === m.id}
                onClick={() => handleSelect(m)}
                onStar={() => handleStar(m.id)}
                onArchive={() => {}}
                onDelete={() => handleDelete(m.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Email detail */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#E7E7E7] bg-white shadow-sm">
        {selected ? (
          <EmailDetailPanel
            message={selected}
            messages={filtered}
            selectedIndex={selectedIndex}
            onClose={() => setSelectedId(null)}
            onPrev={() => selectedIndex > 0 && setSelectedId(filtered[selectedIndex - 1]!.id)}
            onNext={() =>
              selectedIndex < filtered.length - 1 &&
              setSelectedId(filtered[selectedIndex + 1]!.id)
            }
            onStar={() => handleStar(selected.id)}
            onDelete={() => handleDelete(selected.id)}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Work panel */}
      <WorkPanel
        selected={null}
        open={workPanelOpen}
        integrations={[]}
        onToggle={() => setWorkPanelOpen((v) => !v)}
        onPatch={() => {}}
      />
    </div>
  );
}
