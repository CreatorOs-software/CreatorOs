"use client"

import * as React from "react"
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
} from "react"
import {
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  GridIcon,
  HeadphonesIcon,
  ImageIcon,
  ListIcon,
  SearchIcon,
  SortAscIcon,
  SortDescIcon,
  Trash2Icon,
  UploadCloudIcon,
  UploadIcon,
  VideoIcon,
  X,
  Loader2Icon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---------- Types ----------
export type FileMetadata = {
  name: string
  size: number
  type: string
  url: string
  id: string
}

export type FileWithPreview = {
  file: File | FileMetadata
  id: string
  preview?: string
}

export type FileUploadOptions = {
  maxFiles?: number
  maxSize?: number
  accept?: string
  multiple?: boolean
  initialFiles?: FileMetadata[]
  onFilesChange?: (files: FileWithPreview[]) => void
  onFilesAdded?: (addedFiles: FileWithPreview[]) => void
}

export type FileUploadState = {
  files: FileWithPreview[]
  isDragging: boolean
  errors: string[]
}

export type FileUploadActions = {
  addFiles: (files: FileList | File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  clearErrors: () => void
  handleDragEnter: (e: DragEvent<HTMLElement>) => void
  handleDragLeave: (e: DragEvent<HTMLElement>) => void
  handleDragOver: (e: DragEvent<HTMLElement>) => void
  handleDrop: (e: DragEvent<HTMLElement>) => void
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  openFileDialog: () => void
  getInputProps: (
    props?: InputHTMLAttributes<HTMLInputElement>
  ) => InputHTMLAttributes<HTMLInputElement> & { ref: React.Ref<HTMLInputElement> }
}

// ---------- Hook ----------
export const useFileUpload = (
  options: FileUploadOptions = {}
): [FileUploadState, FileUploadActions] => {
  const {
    maxFiles = Infinity,
    maxSize = Infinity,
    accept = "*",
    multiple = false,
    initialFiles = [],
    onFilesChange,
    onFilesAdded,
  } = options

  const [state, setState] = useState<FileUploadState>({
    files: initialFiles.map((file) => ({ file, id: file.id, preview: file.url })),
    isDragging: false,
    errors: [],
  })

  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File | FileMetadata): string | null => {
      if (file.size > maxSize) {
        return `Datei "${file.name}" überschreitet die maximale Größe von ${formatBytes(maxSize)}.`
      }
      if (accept !== "*") {
        const acceptedTypes = accept.split(",").map((t) => t.trim())
        const fileType = file instanceof File ? file.type || "" : file.type
        const fileExtension = `.${file.name.split(".").pop()}`
        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith(".")) return fileExtension.toLowerCase() === type.toLowerCase()
          if (type.endsWith("/*")) return fileType.startsWith(`${type.split("/")[0]}/`)
          return fileType === type
        })
        if (!isAccepted) return `Datei "${file.name}" hat keinen akzeptierten Dateityp.`
      }
      return null
    },
    [accept, maxSize]
  )

  const createPreview = useCallback((file: File | FileMetadata): string | undefined => {
    if (file instanceof File) return URL.createObjectURL(file)
    return file.url
  }, [])

  const generateUniqueId = useCallback((file: File | FileMetadata): string => {
    if (file instanceof File) {
      return `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }
    return file.id
  }, [])

  const clearFiles = useCallback(() => {
    setState((prev) => {
      prev.files.forEach((f) => {
        if (f.preview && f.file instanceof File && f.file.type.startsWith("image/")) {
          URL.revokeObjectURL(f.preview)
        }
      })
      if (inputRef.current) inputRef.current.value = ""
      const newState = { ...prev, files: [], errors: [] }
      onFilesChange?.(newState.files)
      return newState
    })
  }, [onFilesChange])

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      if (!newFiles || newFiles.length === 0) return
      const newFilesArray = Array.from(newFiles)
      const errors: string[] = []

      setState((prev) => ({ ...prev, errors: [] }))
      if (!multiple) clearFiles()

      if (multiple && maxFiles !== Infinity && state.files.length + newFilesArray.length > maxFiles) {
        errors.push(`Maximal ${maxFiles} Dateien erlaubt.`)
        setState((prev) => ({ ...prev, errors }))
        return
      }

      const validFiles: FileWithPreview[] = []
      newFilesArray.forEach((file) => {
        if (multiple) {
          const isDuplicate = state.files.some(
            (ef) => ef.file.name === file.name && ef.file.size === file.size
          )
          if (isDuplicate) return
        }
        if (file.size > maxSize) {
          errors.push(
            multiple
              ? `Einige Dateien überschreiten die maximale Größe von ${formatBytes(maxSize)}.`
              : `Datei überschreitet die maximale Größe von ${formatBytes(maxSize)}.`
          )
          return
        }
        const error = validateFile(file)
        if (error) {
          errors.push(error)
        } else {
          validFiles.push({ file, id: generateUniqueId(file), preview: createPreview(file) })
        }
      })

      if (validFiles.length > 0) {
        onFilesAdded?.(validFiles)
        setState((prev) => {
          const newFileList = !multiple ? validFiles : [...prev.files, ...validFiles]
          onFilesChange?.(newFileList)
          return { ...prev, files: newFileList, errors }
        })
      } else if (errors.length > 0) {
        setState((prev) => ({ ...prev, errors }))
      }

      if (inputRef.current) inputRef.current.value = ""
    },
    [state.files, maxFiles, multiple, maxSize, validateFile, createPreview, generateUniqueId, clearFiles, onFilesChange, onFilesAdded]
  )

  const removeFile = useCallback(
    (id: string) => {
      setState((prev) => {
        const toRemove = prev.files.find((f) => f.id === id)
        if (toRemove?.preview && toRemove.file instanceof File && toRemove.file.type.startsWith("image/")) {
          URL.revokeObjectURL(toRemove.preview)
        }
        const newFiles = prev.files.filter((f) => f.id !== id)
        onFilesChange?.(newFiles)
        return { ...prev, files: newFiles, errors: [] }
      })
    },
    [onFilesChange]
  )

  const clearErrors = useCallback(() => setState((prev) => ({ ...prev, errors: [] })), [])
  const handleDragEnter = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault(); e.stopPropagation()
    setState((prev) => ({ ...prev, isDragging: true }))
  }, [])
  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault(); e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setState((prev) => ({ ...prev, isDragging: false }))
  }, [])
  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault(); e.stopPropagation()
  }, [])
  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault(); e.stopPropagation()
      setState((prev) => ({ ...prev, isDragging: false }))
      if (inputRef.current?.disabled) return
      if (e.dataTransfer.files?.length > 0) {
        addFiles(!multiple ? [e.dataTransfer.files[0]] : e.dataTransfer.files)
      }
    },
    [addFiles, multiple]
  )
  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) addFiles(e.target.files)
    },
    [addFiles]
  )
  const openFileDialog = useCallback(() => inputRef.current?.click(), [])
  const getInputProps = useCallback(
    (props: InputHTMLAttributes<HTMLInputElement> = {}) => ({
      ...props,
      type: "file" as const,
      onChange: handleFileChange,
      accept: props.accept || accept,
      multiple: props.multiple !== undefined ? props.multiple : multiple,
      ref: inputRef,
    }),
    [accept, multiple, handleFileChange]
  )

  return [
    state,
    { addFiles, removeFile, clearFiles, clearErrors, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handleFileChange, openFileDialog, getInputProps },
  ]
}

// ---------- Helpers ----------
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

type UploadEntry = { id: string; file: File | { name: string; type: string; size: number }; preview?: string }

const isRealFile = (f: unknown): f is File =>
  typeof window !== "undefined" && typeof File !== "undefined" && f instanceof File

const getName = (e: UploadEntry) => e.file.name
const getType = (e: UploadEntry) => (isRealFile(e.file) ? e.file.type : e.file.type || "")
const getSize = (e: UploadEntry) => (isRealFile(e.file) ? e.file.size : e.file.size ?? 0)
const getExt = (name: string) => { const d = name.lastIndexOf("."); return d > -1 ? name.slice(d + 1).toLowerCase() : "" }
const getPreviewUrl = (e: UploadEntry) => e.preview || (e as unknown as { url?: string }).url || ""
const niceSubtype = (mime: string) => {
  if (!mime) return "UNBEKANNT"
  const p = mime.split("/")
  return (p[1] || p[0] || "unbekannt").toUpperCase()
}

const getFileIcon = (entry: UploadEntry) => {
  const name = getName(entry), type = getType(entry), ext = getExt(name)
  if (type.includes("pdf") || ext === "pdf" || type.includes("word") || ["doc","docx"].includes(ext) || type.includes("text") || ["txt","md"].includes(ext))
    return <FileTextIcon className="size-4 opacity-60" aria-hidden="true" />
  if (type.includes("zip") || type.includes("archive") || ["zip","rar","7z","tar"].includes(ext))
    return <FileArchiveIcon className="size-4 opacity-60" aria-hidden="true" />
  if (type.includes("excel") || ["xls","xlsx","csv"].includes(ext))
    return <FileSpreadsheetIcon className="size-4 opacity-60" aria-hidden="true" />
  if (type.startsWith("video/") || ["mp4","mov","webm","mkv"].includes(ext))
    return <VideoIcon className="size-4 opacity-60" aria-hidden="true" />
  if (type.startsWith("audio/") || ["mp3","wav","flac","m4a"].includes(ext))
    return <HeadphonesIcon className="size-4 opacity-60" aria-hidden="true" />
  if (type.startsWith("image/") || ["png","jpg","jpeg","gif","webp"].includes(ext))
    return <ImageIcon className="size-4 opacity-60" aria-hidden="true" />
  return <FileIcon className="size-4 opacity-60" aria-hidden="true" />
}

// ---------- Legacy image-only uploader (used in deal creation form) ----------
interface FileUploadProps {
  files: File[]
  onChange: (files: File[]) => void
  accept?: string
  maxFiles?: number
  className?: string
}

export function FileUpload({ files, onChange, accept = "image/*", maxFiles = 10, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return
    const imageFiles = Array.from(newFiles).filter((f) => f.type.startsWith("image/"))
    onChange([...files, ...imageFiles].slice(0, maxFiles))
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors text-center",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30 hover:bg-muted/30",
        )}
      >
        <ImageIcon className="w-6 h-6 text-muted-foreground" />
        <div>
          <p className="text-sm text-foreground font-medium">Bilder hier ablegen oder klicken</p>
          <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, GIF, WEBP · max. {maxFiles} Bilder</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => { addFiles(e.target.files); e.target.value = "" }}
      />
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((file, i) => (
            <ImageThumb key={i} file={file} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ImageThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string>("")
  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return (
    <div className="relative group rounded-lg overflow-hidden aspect-square bg-muted border border-border">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-white truncate">{file.name}</p>
      </div>
    </div>
  )
}

// ---------- Document Entry (API shape) ----------
type DocEntry = {
  id: string
  name: string
  size: number
  type: string
  url: string
  path: string
}

const docToUploadEntry = (d: DocEntry): UploadEntry => ({
  id: d.id,
  file: { name: d.name, type: d.type, size: d.size },
  preview: d.url,
})

// ---------- Main Document Upload Component ----------
export function DocumentUpload({ creatorId }: { creatorId: string }) {
  const maxSize = 20 * 1024 * 1024
  const maxFiles = 20

  // -- Server state --
  const [documents, setDocuments] = React.useState<DocEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [uploading, setUploading] = React.useState<Set<string>>(new Set())
  const [deleting, setDeleting] = React.useState<Set<string>>(new Set())
  const [apiError, setApiError] = React.useState<string | null>(null)

  // -- UI state --
  const [view, setView] = React.useState<"list" | "grid">("list")
  const [query, setQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"name" | "type" | "size">("name")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [copied, setCopied] = React.useState<string | null>(null)

  // Load documents on mount
  React.useEffect(() => {
    fetch(`/api/creators/${creatorId}/documents`)
      .then((r) => r.json())
      .then((data) => { setDocuments(data.documents ?? []); setLoading(false) })
      .catch(() => { setApiError("Fehler beim Laden der Dokumente"); setLoading(false) })
  }, [creatorId])

  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 1200)
    return () => clearTimeout(t)
  }, [copied])

  // Upload new files via API
  const uploadFiles = React.useCallback(
    async (newFiles: FileWithPreview[]) => {
      setApiError(null)
      for (const fw of newFiles) {
        if (!(fw.file instanceof File)) continue
        const file = fw.file
        setUploading((prev) => new Set(prev).add(file.name))
        try {
          const formData = new FormData()
          formData.append("file", file)
          const res = await fetch(`/api/creators/${creatorId}/documents`, {
            method: "POST",
            body: formData,
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen")
          setDocuments((prev) => [data.document, ...prev])
        } catch (e) {
          setApiError(e instanceof Error ? e.message : "Fehler beim Hochladen")
        } finally {
          setUploading((prev) => { const n = new Set(prev); n.delete(file.name); return n })
        }
      }
    },
    [creatorId]
  )

  // Delete a single document via API
  const deleteDocument = React.useCallback(
    async (doc: DocEntry) => {
      setDeleting((prev) => new Set(prev).add(doc.id))
      setApiError(null)
      try {
        const res = await fetch(`/api/creators/${creatorId}/documents`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: doc.path }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error ?? "Fehler beim Löschen")
        }
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
        setSelected((prev) => { const n = new Set(prev); n.delete(doc.id); return n })
      } catch (e) {
        setApiError(e instanceof Error ? e.message : "Fehler beim Löschen")
      } finally {
        setDeleting((prev) => { const n = new Set(prev); n.delete(doc.id); return n })
      }
    },
    [creatorId]
  )

  // DnD/input hook — only used for drag state + validation + triggering uploadFiles
  const [
    { isDragging, errors },
    { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, getInputProps },
  ] = useFileUpload({ multiple: true, maxFiles, maxSize, onFilesAdded: uploadFiles })

  const isUploading = uploading.size > 0

  const totalSize = React.useMemo(
    () => documents.reduce((acc, d) => acc + d.size, 0),
    [documents]
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? documents.filter((d) => {
          const ext = getExt(d.name)
          return (
            d.name.toLowerCase().includes(q) ||
            d.type.toLowerCase().includes(q) ||
            ext.includes(q)
          )
        })
      : documents

    return [...base].sort((a, b) => {
      let cmp = 0
      if (sortBy === "name") cmp = a.name.localeCompare(b.name)
      else if (sortBy === "type") cmp = a.type.localeCompare(b.type)
      else cmp = a.size - b.size
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [documents, query, sortBy, sortDir])

  const allSelected = selected.size > 0 && filtered.every((d) => selected.has(d.id))
  const noneSelected = selected.size === 0

  const toggleOne = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleAll = () =>
    setSelected((prev) => {
      if (!filtered.length) return prev
      return filtered.every((d) => prev.has(d.id)) ? new Set() : new Set(filtered.map((d) => d.id))
    })

  const removeSelected = async () => {
    const toDelete = filtered.filter((d) => selected.has(d.id))
    await Promise.all(toDelete.map(deleteDocument))
  }

  const copyLink = async (doc: DocEntry) => {
    if (!doc.url) return
    try { await navigator.clipboard.writeText(doc.url); setCopied(doc.id) } catch { /* noop */ }
  }

  const currentErrors = errors.length > 0 ? errors[0] : apiError

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">
            Dokumente{" "}
            <span className="text-muted-foreground font-normal">({documents.length})</span>
          </h3>
          {documents.length > 0 && (
            <span className="text-muted-foreground text-xs">{formatBytes(totalSize)}</span>
          )}
          {isUploading && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Loader2Icon className="size-3 animate-spin" />
              Wird hochgeladen…
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen…"
              className="h-7 w-44 pl-7 text-[13px]"
              aria-label="Dateien suchen"
            />
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2"
              aria-hidden="true"
            />
          </div>

          <div className="flex items-center gap-1">
            <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-7 text-[13px]" aria-label="Sortieren nach">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="type">Typ</SelectItem>
                <SelectItem value="size">Größe</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              aria-label="Sortierrichtung"
            >
              {sortDir === "asc" ? <SortAscIcon className="size-3.5" /> : <SortDescIcon className="size-3.5" />}
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant={view === "list" ? "default" : "outline"} size="icon-sm" onClick={() => setView("list")} aria-label="Listenansicht">
              <ListIcon className="size-3.5" />
            </Button>
            <Button variant={view === "grid" ? "default" : "outline"} size="icon-sm" onClick={() => setView("grid")} aria-label="Rasteransicht">
              <GridIcon className="size-3.5" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={openFileDialog} disabled={isUploading}>
            <UploadCloudIcon className="size-3.5 opacity-60" aria-hidden="true" />
            Hinzufügen
          </Button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        className="border-border data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/5 rounded-xl border border-dashed p-3 transition-colors"
        aria-label="Dateien hier ablegen"
      >
        <input {...getInputProps({ "aria-label": "Dateien hochladen" })} className="sr-only" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
              <FileIcon className="size-4 text-primary" aria-hidden="true" />
            </div>
            <div className="text-xs">
              <p className="font-medium">Dateien ablegen zum Hochladen</p>
              <p className="text-muted-foreground">
                Bis zu {maxFiles} Dateien · {formatBytes(maxSize)} pro Datei
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openFileDialog} disabled={isUploading}>
            <UploadIcon className="size-3.5 opacity-60" aria-hidden="true" />
            Dateien auswählen
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* File list */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Bulk action bar */}
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px]">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => toggleAll()}
                aria-label={allSelected ? "Alle abwählen" : "Alle auswählen"}
              />
              <span className="text-muted-foreground">
                {selected.size}/{filtered.length} ausgewählt
              </span>
            </label>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline" size="sm"
                onClick={() => { const sel = filtered.filter((d) => selected.has(d.id)); sel.forEach((d) => window.open(d.url, "_blank", "noopener,noreferrer")) }}
                disabled={noneSelected}
              >
                <DownloadIcon className="size-3.5 opacity-60" aria-hidden="true" />
                Herunterladen
              </Button>
              <Button variant="outline" size="sm" onClick={removeSelected} disabled={noneSelected || deleting.size > 0}>
                <Trash2Icon className="size-3.5 opacity-60" aria-hidden="true" />
                Entfernen
              </Button>
            </div>
          </div>

          {view === "list" ? (
            <div className="bg-card overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-9 w-10 py-2 text-xs"><span className="sr-only">Auswahl</span></TableHead>
                    <TableHead className="h-9 py-2 text-xs">Name</TableHead>
                    <TableHead className="h-9 py-2 text-xs">Typ</TableHead>
                    <TableHead className="h-9 py-2 text-xs">Größe</TableHead>
                    <TableHead className="h-9 w-0 py-2 text-xs text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-[13px]">
                  {filtered.map((doc) => {
                    const entry = docToUploadEntry(doc)
                    const isSelected = selected.has(doc.id)
                    const isDeleting = deleting.has(doc.id)
                    const percentOfMax = Math.min(100, Math.round((doc.size / maxSize) * 100))
                    return (
                      <TableRow key={doc.id} className={isSelected ? "bg-primary/5" : ""}>
                        <TableCell className="py-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOne(doc.id)}
                            aria-label={`${doc.name} auswählen`}
                          />
                        </TableCell>
                        <TableCell className="max-w-64 py-2 font-medium">
                          <span className="flex items-center gap-2">
                            <span className="shrink-0 text-primary">{getFileIcon(entry)}</span>
                            <span className="truncate">{doc.name}</span>
                          </span>
                          <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-border">
                            <div className="h-full bg-primary/50" style={{ width: `${percentOfMax}%` }} aria-hidden="true" />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground py-2 text-xs">{niceSubtype(doc.type)}</TableCell>
                        <TableCell className="text-muted-foreground py-2 text-xs">{formatBytes(doc.size)}</TableCell>
                        <TableCell className="py-2 text-right whitespace-nowrap">
                          <Button size="icon-sm" variant="ghost" aria-label={`${doc.name} öffnen`}
                            onClick={() => doc.url && window.open(doc.url, "_blank", "noopener,noreferrer")}>
                            <ExternalLinkIcon className="size-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label={`${doc.name} herunterladen`}
                            onClick={() => doc.url && window.open(doc.url, "_blank", "noopener,noreferrer")}>
                            <DownloadIcon className="size-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label="Link kopieren" onClick={() => copyLink(doc)}>
                            {copied === doc.id
                              ? <CheckIcon className="size-3.5 text-primary" />
                              : <CopyIcon className="size-3.5" />}
                          </Button>
                          <Button size="icon-sm" variant="ghost"
                            aria-label={`${doc.name} entfernen`}
                            onClick={() => deleteDocument(doc)}
                            disabled={isDeleting}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            {isDeleting
                              ? <Loader2Icon className="size-3.5 animate-spin" />
                              : <Trash2Icon className="size-3.5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="list">
              {filtered.map((doc) => {
                const entry = docToUploadEntry(doc)
                const isImage = doc.type.startsWith("image/")
                const isSelected = selected.has(doc.id)
                const isDeleting = deleting.has(doc.id)
                return (
                  <div
                    key={doc.id}
                    role="listitem"
                    className={`relative flex flex-col overflow-hidden rounded-xl border transition-all ${
                      isSelected ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <label className="bg-card/80 absolute left-2 top-2 z-10 inline-flex items-center rounded-lg px-1.5 py-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(doc.id)}
                        aria-label={`${doc.name} auswählen`}
                      />
                    </label>
                    <div className="relative h-24 w-full overflow-hidden bg-muted/30">
                      {isImage && doc.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={doc.url} alt={doc.name} className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-primary">
                          {getFileIcon(entry)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-2">
                      <div className="truncate text-[13px] font-medium" title={doc.name}>{doc.name}</div>
                      <div className="text-muted-foreground text-[11px]">
                        {niceSubtype(doc.type)} · {formatBytes(doc.size)}
                      </div>
                      <div className="mt-auto flex items-center justify-end gap-0.5">
                        <Button size="icon-sm" variant="ghost" aria-label={`${doc.name} öffnen`}
                          onClick={() => doc.url && window.open(doc.url, "_blank", "noopener,noreferrer")}>
                          <ExternalLinkIcon className="size-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Herunterladen"
                          onClick={() => doc.url && window.open(doc.url, "_blank", "noopener,noreferrer")}>
                          <DownloadIcon className="size-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Link kopieren" onClick={() => copyLink(doc)}>
                          {copied === doc.id
                            ? <CheckIcon className="size-3.5 text-primary" />
                            : <CopyIcon className="size-3.5" />}
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`${doc.name} entfernen`}
                          onClick={() => deleteDocument(doc)}
                          disabled={isDeleting}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          {isDeleting
                            ? <Loader2Icon className="size-3.5 animate-spin" />
                            : <Trash2Icon className="size-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <p className="text-muted-foreground text-center text-sm py-6">
          {documents.length === 0
            ? "Noch keine Dokumente. Dateien hinzufügen oder hier ablegen."
            : "Keine Dateien entsprechen der Suche."}
        </p>
      )}

      {/* Errors */}
      {currentErrors && (
        <div className="text-destructive flex items-center gap-1.5 text-xs" role="alert" aria-live="assertive">
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{currentErrors}</span>
        </div>
      )}
    </div>
  )
}
