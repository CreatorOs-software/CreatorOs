"use client";

import * as React from "react";
import { useRef, ChangeEvent, DragEvent, useEffect, useState } from "react";
import { ImageIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImageUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  className?: string;
}

export function ImageUpload({
  files,
  onChange,
  maxFiles = 10,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/"),
    );
    const combined = [...files, ...imageFiles].slice(0, maxFiles);
    onChange(combined);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors text-center",
          dragOver
            ? "border-ring bg-accent/20"
            : "border-border-light hover:border-foreground/30 hover:bg-muted/30",
        )}
      >
        <ImageIcon className="w-6 h-6 text-muted-foreground" />
        <div>
          <p className="text-sm text-foreground font-medium">
            Bilder hier ablegen oder klicken
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            JPG, PNG, GIF, WEBP · max. {maxFiles} Bilder
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((file, i) => (
            <ImageThumb key={i} file={file} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative group rounded-lg overflow-hidden aspect-square bg-muted border border-border-light">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
      >
        <X className="w-3 h-3" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-white truncate">{file.name}</p>
      </div>
    </div>
  );
}
