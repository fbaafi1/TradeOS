"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, ImageIcon, Loader2 } from "lucide-react";

interface Screenshot {
  id: string;
  screenshot_type: string;
  storage_path: string;
  url?: string;
}

interface TradeScreenshotsProps {
  tradeId: string;
  initialScreenshots?: Screenshot[];
}

const BUCKET = "trade-screenshots";
const TYPES = [
  { value: "before_entry", label: "Before Entry" },
  { value: "entry", label: "At Entry" },
  { value: "exit", label: "At Exit" },
];

export function TradeScreenshots({ tradeId, initialScreenshots = [] }: TradeScreenshotsProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>(initialScreenshots);
  const [uploadType, setUploadType] = useState("before_entry");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function getSignedUrl(path: string) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60); // 1 hour
    return data?.signedUrl ?? null;
  }

  async function handleUpload(file: File) {
    if (!file) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setUploading(false); return; }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowed.includes(ext)) {
      setError("Only JPG, PNG, WebP and GIF images are supported.");
      setUploading(false);
      return;
    }

    const path = `${user.id}/${tradeId}/${uploadType}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });

    if (uploadErr) {
      // Common: bucket doesn't exist yet
      if (uploadErr.message.includes("Bucket not found") || uploadErr.message.includes("not found")) {
        setError("Storage bucket 'trade-screenshots' not found. Create it in your Supabase dashboard: Storage → New Bucket → name: trade-screenshots → Private.");
      } else {
        setError(uploadErr.message);
      }
      setUploading(false);
      return;
    }

    // Save to DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error: dbErr } = await (supabase as any)
      .from("trade_screenshots")
      .insert({ trade_id: tradeId, screenshot_type: uploadType, storage_path: path })
      .select("*")
      .single();

    if (dbErr) { setError(dbErr.message); setUploading(false); return; }

    const url = await getSignedUrl(path);
    setScreenshots((prev) => [...prev, { ...row, url: url ?? undefined }]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function handleDelete(screenshot: Screenshot) {
    setDeleting(screenshot.id);
    const supabase = createClient();

    await supabase.storage.from(BUCKET).remove([screenshot.storage_path]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("trade_screenshots").delete().eq("id", screenshot.id);

    setScreenshots((prev) => prev.filter((s) => s.id !== screenshot.id));
    setDeleting(null);
    router.refresh();
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [uploadType]
  );

  // Load signed URLs for existing screenshots on first render
  useState(() => {
    if (initialScreenshots.length > 0) {
      Promise.all(
        initialScreenshots.map(async (s) => ({
          ...s,
          url: (await getSignedUrl(s.storage_path)) ?? undefined,
        }))
      ).then(setScreenshots);
    }
  });

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Trade Screenshots
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {/* Upload area */}
          <div
            className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 cursor-pointer"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground text-center">
              {uploading ? "Uploading…" : "Drag & drop or click to upload"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </div>

          {/* Type selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Upload as:</span>
            <Select value={uploadType} onValueChange={setUploadType}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Upload
            </Button>
          </div>

          {/* Screenshot grid */}
          {screenshots.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {screenshots.map((s) => (
                <div key={s.id} className="group relative rounded-lg overflow-hidden border border-border bg-muted aspect-video">
                  {s.url ? (
                    <img
                      src={s.url}
                      alt={s.screenshot_type}
                      className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => setLightbox(s.url!)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <span className="text-xs text-white font-medium">
                      {TYPES.find((t) => t.value === s.screenshot_type)?.label ?? s.screenshot_type}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7"
                      disabled={deleting === s.id}
                      onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                    >
                      {deleting === s.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {screenshots.length === 0 && !uploading && (
            <p className="text-center text-xs text-muted-foreground">
              No screenshots yet. Upload before/entry/exit charts to document your trade setups.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Screenshot"
            className="max-h-full max-w-full rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}
