"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Folder,
  Upload,
  MoreHorizontal,
  LayoutGrid,
  List,
  Star,
  ChevronRight,
  FileText,
  FileImage,
  Trash2,
  Pencil,
  Download,
  Pin,
  FolderPlus,
  ChevronDown,
  X,
  Home,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FMFile {
  name: string;
  isDirectory: boolean;
  path: string;
  size?: number;
  updatedAt?: string;
  pinned?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(0)}mb`;
}

function fmtRelative(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Updated ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `Updated ${months} month${months === 1 ? "" : "s"} ago`;
}

function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/")) || "";
}

type FileIconType = "doc" | "pdf" | "sheet" | "slide" | "image" | "file";

function getTypeInfo(name: string): { bg: string; label: string; iconType: FileIconType } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["doc", "docx"].includes(ext)) return { bg: "#4285F4", label: "W", iconType: "doc" };
  if (ext === "pdf") return { bg: "#EA4335", label: "PDF", iconType: "pdf" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { bg: "#34A853", label: "XLS", iconType: "sheet" };
  if (["ppt", "pptx"].includes(ext)) return { bg: "#FA7B17", label: "PPT", iconType: "slide" };
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return { bg: "#9AA0A6", label: "IMG", iconType: "image" };
  return { bg: "#9AA0A6", label: "FILE", iconType: "file" };
}

function seededGradient(name: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return {
    from: `hsl(${hue}, 55%, 82%)`,
    to: `hsl(${(hue + 40) % 360}, 55%, 70%)`,
  };
}

// ── File Icon ──────────────────────────────────────────────────────────────────

function FileTypeIcon({ name, size = 52 }: { name: string; size?: number }) {
  const { bg, label, iconType } = getTypeInfo(name);
  const iconSize = size * 0.46;

  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size * 1.15, background: bg }}
    >
      {iconType === "image" ? (
        <FileImage style={{ width: iconSize, height: iconSize }} className="text-white" />
      ) : iconType === "file" ? (
        <FileText style={{ width: iconSize, height: iconSize }} className="text-white" />
      ) : (
        <span
          className="font-bold text-white leading-none tracking-tight"
          style={{ fontSize: size * 0.2 }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

// ── Pinned Card ────────────────────────────────────────────────────────────────

function PinnedCard({
  file,
  fileCount,
  onOpen,
  onMenu,
}: {
  file: FMFile;
  fileCount: number;
  onOpen: (f: FMFile) => void;
  onMenu: (f: FMFile, e: React.MouseEvent) => void;
}) {
  const grad = seededGradient(file.name);

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 10px 28px rgba(0,0,0,0.10)" }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border border-border-light bg-card overflow-hidden cursor-pointer select-none"
      onClick={() => onOpen(file)}
    >
      {/* Preview */}
      <div
        className="relative h-36 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)` }}
      >
        <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
          <Star className="w-3.5 h-3.5 text-white fill-white" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onMenu(file, e); }}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors"
        >
          <MoreHorizontal className="w-4 h-4 text-white" />
        </button>
        {file.isDirectory ? (
          <Folder className="w-14 h-14 text-white/40" />
        ) : (
          <FileTypeIcon name={file.name} size={42} />
        )}
        {file.isDirectory && (
          <span className="absolute bottom-3 right-3 text-[11px] text-white/70 font-medium">
            {fileCount} files
          </span>
        )}
      </div>
      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {file.isDirectory ? `${fileCount} files` : fmtSize(file.size)}
        </p>
      </div>
    </motion.div>
  );
}

// ── Context Menu ───────────────────────────────────────────────────────────────

function CtxMenu({
  file,
  pos,
  onClose,
  onPin,
  onRename,
  onDownload,
  onDelete,
}: {
  file: FMFile;
  pos: { x: number; y: number };
  onClose: () => void;
  onPin: () => void;
  onRename: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.min(pos.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 200),
    left: Math.min(pos.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 190),
    zIndex: 9999,
  };

  const actions = [
    {
      label: file.pinned ? "Loslösen" : "Anpinnen",
      icon: <Pin className="w-4 h-4" />,
      fn: onPin,
    },
    { label: "Umbenennen", icon: <Pencil className="w-4 h-4" />, fn: onRename },
    ...(!file.isDirectory
      ? [{ label: "Herunterladen", icon: <Download className="w-4 h-4" />, fn: onDownload }]
      : []),
    {
      label: "Löschen",
      icon: <Trash2 className="w-4 h-4" />,
      fn: onDelete,
      danger: true,
    },
  ];

  return (
    <motion.div
      ref={ref}
      style={style}
      initial={{ opacity: 0, scale: 0.9, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -6 }}
      transition={{ duration: 0.12 }}
      className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden min-w-[170px] py-1"
    >
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => { a.fn(); onClose(); }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left",
            a.danger && "text-destructive hover:bg-destructive/5",
          )}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </motion.div>
  );
}

// ── New Folder Dialog ─────────────────────────────────────────────────────────

function NewFolderDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (n: string) => void }) {
  const [name, setName] = useState("Neuer Ordner");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.select(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl p-6 w-80"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Neuer Ordner</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate(name.trim()); }}
        >
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ordnername"
            className="mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Erstellen
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function FileManagerClient({ initialFiles }: { initialFiles: FMFile[] }) {
  const [files, setFiles] = useState<FMFile[]>(initialFiles);
  const [currentPath, setCurrentPath] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renaming, setRenaming] = useState<{ file: FMFile; name: string } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ file: FMFile; pos: { x: number; y: number } } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);

  // Derived state
  const dirItems = files.filter((f) => parentOf(f.path) === currentPath);
  const folders = dirItems.filter((f) => f.isDirectory);
  const filesList = dirItems.filter((f) => !f.isDirectory);
  const pinned = files.filter((f) => f.pinned);

  const breadcrumbs = currentPath
    ? currentPath.split("/").filter(Boolean).map((seg, i, arr) => ({
        name: seg,
        path: "/" + arr.slice(0, i + 1).join("/"),
      }))
    : [];

  function countInFolder(folderPath: string) {
    return files.filter((f) => parentOf(f.path) === folderPath).length;
  }

  // Close upload menu on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node))
        setUploadMenuOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── API ────────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { files: updated } = await fetch("/api/files").then((r) => r.json());
      setFiles(updated);
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function handleUpload(list: FileList | null) {
    if (!list || list.length === 0) return;
    setIsLoading(true);
    try {
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("path", currentPath);
        const res = await fetch("/api/files/upload", { method: "POST", body: fd });
        if (res.ok) {
          const newFile: FMFile = await res.json();
          setFiles((prev) => [...prev, newFile]);
        }
      }
    } finally {
      setIsLoading(false);
      // Reset input so same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  }

  async function handleCreateFolder(name: string) {
    setShowNewFolder(false);
    setIsLoading(true);
    try {
      const res = await fetch("/api/files/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentPath: currentPath }),
      });
      if (res.ok) { const folder = await res.json(); setFiles((prev) => [...prev, folder]); }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(file: FMFile) {
    setIsLoading(true);
    try {
      await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [file] }),
      });
      setFiles((prev) =>
        prev.filter((f) => f.path !== file.path && !f.path.startsWith(file.path + "/")),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRenameSubmit() {
    if (!renaming) return;
    const { file, name } = renaming;
    setRenaming(null);
    if (!name.trim() || name === file.name) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/files/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.path, newName: name.trim() }),
      });
      if (res.ok) {
        const { path: newPath } = await res.json();
        const old = file.path;
        setFiles((prev) =>
          prev.map((f) => {
            if (f.path === old) return { ...f, name: name.trim(), path: newPath };
            if (f.path.startsWith(old + "/")) return { ...f, path: f.path.replace(old, newPath) };
            return f;
          }),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePin(file: FMFile) {
    const res = await fetch("/api/files/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: file.path }),
    });
    if (res.ok) {
      const { pinned: isPinned } = await res.json();
      setFiles((prev) => prev.map((f) => (f.path === file.path ? { ...f, pinned: isPinned } : f)));
    }
  }

  async function handleDownload(file: FMFile) {
    const { url } = await fetch(`/api/files/url?path=${encodeURIComponent(file.path)}`).then((r) => r.json());
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function openCtxMenu(file: FMFile, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ file, pos: { x: e.clientX, y: e.clientY } });
  }

  // ── Shared rename input (used in both grid and list) ───────────────────────

  function RenameInput({ file, className }: { file: FMFile; className?: string }) {
    if (renaming?.file.path !== file.path) return null;
    return (
      <input
        autoFocus
        value={renaming.name}
        onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
        onBlur={handleRenameSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleRenameSubmit();
          if (e.key === "Escape") setRenaming(null);
        }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-transparent text-sm font-medium outline-none border-b border-primary w-full",
          className,
        )}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        // @ts-ignore — webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between shrink-0">
        <div>
          {/* Breadcrumb */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
              <button
                onClick={() => setCurrentPath("")}
                className="hover:text-foreground transition-colors"
              >
                <Home className="w-3 h-3" />
              </button>
              {breadcrumbs.map((crumb) => (
                <span key={crumb.path} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  <button
                    onClick={() => setCurrentPath(crumb.path)}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground leading-none">
            {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : "Files"}
          </h1>
        </div>

        {/* Upload dropdown */}
        <div ref={uploadMenuRef} className="relative">
          <button
            onClick={() => setUploadMenuOpen((v) => !v)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                uploadMenuOpen && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence>
            {uploadMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[190px] z-50 py-1"
              >
                {[
                  {
                    label: "Neuer Ordner",
                    icon: <FolderPlus className="w-4 h-4" />,
                    fn: () => { setUploadMenuOpen(false); setShowNewFolder(true); },
                  },
                  {
                    label: "Dateien hochladen",
                    icon: <Upload className="w-4 h-4" />,
                    fn: () => { setUploadMenuOpen(false); fileInputRef.current?.click(); },
                  },
                  {
                    label: "Ordner hochladen",
                    icon: <Folder className="w-4 h-4" />,
                    fn: () => { setUploadMenuOpen(false); folderInputRef.current?.click(); },
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.fn}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left"
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-8 min-h-0">

        {/* Pinned access */}
        {pinned.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <h2 className="text-sm font-semibold text-foreground">Pinned access</h2>
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {pinned.map((f) => (
                <PinnedCard
                  key={f.path}
                  file={f}
                  fileCount={countInFolder(f.path)}
                  onOpen={(file) => file.isDirectory && setCurrentPath(file.path)}
                  onMenu={openCtxMenu}
                />
              ))}
            </div>
          </section>
        )}

        {/* Folders */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Ordner</h2>
          {folders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Ordner</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {folders.map((folder) => (
                <div
                  key={folder.path}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border-light bg-card cursor-pointer group hover:bg-muted/40 transition-colors"
                  onClick={() => setCurrentPath(folder.path)}
                  onContextMenu={(e) => openCtxMenu(folder, e)}
                >
                  <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                  {renaming?.file.path === folder.path ? (
                    <RenameInput file={folder} />
                  ) : (
                    <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                      {folder.name}
                    </span>
                  )}
                  <button
                    onClick={(e) => openCtxMenu(folder, e)}
                    className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all shrink-0"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Files */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Dateien</h2>
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 gap-0.5">
              {(["grid", "list"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === mode
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode === "grid" ? (
                    <LayoutGrid className="w-3.5 h-3.5" />
                  ) : (
                    <List className="w-3.5 h-3.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {filesList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Dateien</p>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filesList.map((file) => (
                <motion.div
                  key={file.path}
                  whileHover={{ y: -2, boxShadow: "0 8px 22px rgba(0,0,0,0.08)" }}
                  transition={{ duration: 0.15 }}
                  className="rounded-xl border border-border-light bg-card p-3 cursor-pointer group select-none"
                  onContextMenu={(e) => openCtxMenu(file, e)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[11px] text-muted-foreground">{fmtSize(file.size)}</span>
                    <button
                      onClick={(e) => openCtxMenu(file, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-muted transition-all"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex justify-center mb-3">
                    <FileTypeIcon name={file.name} size={52} />
                  </div>
                  <div>
                    {renaming?.file.path === file.path ? (
                      <RenameInput file={file} className="text-sm font-medium" />
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {fmtRelative(file.updatedAt)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border-light overflow-hidden">
              {filesList.map((file, i) => (
                <div
                  key={file.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer group transition-colors",
                    i > 0 && "border-t border-border-light",
                  )}
                  onContextMenu={(e) => openCtxMenu(file, e)}
                >
                  <FileTypeIcon name={file.name} size={28} />
                  <div className="flex-1 min-w-0">
                    {renaming?.file.path === file.path ? (
                      <RenameInput file={file} />
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{fmtRelative(file.updatedAt)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                    {fmtSize(file.size)}
                  </span>
                  <button
                    onClick={(e) => openCtxMenu(file, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted/60 transition-all"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Overlays ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewFolder && (
          <NewFolderDialog
            onClose={() => setShowNewFolder(false)}
            onCreate={handleCreateFolder}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ctxMenu && (
          <CtxMenu
            file={ctxMenu.file}
            pos={ctxMenu.pos}
            onClose={() => setCtxMenu(null)}
            onPin={() => handlePin(ctxMenu.file)}
            onRename={() => setRenaming({ file: ctxMenu.file, name: ctxMenu.file.name })}
            onDownload={() => handleDownload(ctxMenu.file)}
            onDelete={() => handleDelete(ctxMenu.file)}
          />
        )}
      </AnimatePresence>

      {/* Loading spinner */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/40 backdrop-blur-[1px] z-40 flex items-center justify-center pointer-events-none">
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}
