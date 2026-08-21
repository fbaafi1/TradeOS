"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, X, ImageIcon, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadScreenshot, deleteScreenshot } from "@/lib/actions/screenshots";

interface Props {
  currentUrl?: string | null;
  folder?: string;
  label?: string;
  onUploaded?: (url: string) => void;
  onDeleted?: () => void;
  className?: string;
}

export function ScreenshotUpload({
  currentUrl,
  folder = "trades",
  label = "Screenshot",
  onUploaded,
  onDeleted,
  className,
}: Props) {
  const [url, setUrl] = useState(currentUrl ?? null);
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      // Delete old if exists
      if (url) await deleteScreenshot(url);
      const newUrl = await uploadScreenshot(fd, folder);
      if (newUrl) {
        setUrl(newUrl);
        onUploaded?.(newUrl);
      }
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleDelete() {
    if (!url) return;
    startTransition(async () => {
      await deleteScreenshot(url);
      setUrl(null);
      onDeleted?.();
    });
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}

      {url ? (
        /* Preview */
        <div className="relative group rounded-xl overflow-hidden border border-border bg-card">
          <img src={url} alt="Trade screenshot" className="w-full max-h-64 object-contain"/>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 h-8 text-xs text-white font-medium transition-colors">
              <ExternalLink className="h-3.5 w-3.5"/> View
            </a>
            <button onClick={handleDelete} disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-loss/30 hover:bg-loss/50 px-3 h-8 text-xs text-white font-medium transition-colors disabled:opacity-50">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <X className="h-3.5 w-3.5"/>} Remove
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/30",
            isPending && "pointer-events-none opacity-60"
          )}
        >
          {isPending ? (
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin"/>
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground"/>
          )}
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground">
              {isPending ? "Uploading..." : "Drop image or click to upload"}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG, WebP · Max 10MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}
    </div>
  );
}
