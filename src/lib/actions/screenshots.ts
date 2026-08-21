"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { updateJournalTrade } from "./trading-os";

const BUCKET = "trade-screenshots";

/**
 * Upload a screenshot and return its public URL.
 * folder: e.g. "trades" | "analysis" | "daily"
 */
export async function uploadScreenshot(
  formData: FormData,
  folder: string = "trades"
): Promise<string | null> {
  const file = formData.get("file") as File | null;
  if (!file) return null;

  const db = createAdminClient();
  const ext = file.name.split(".").pop() ?? "png";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await db.storage
    .from(BUCKET)
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("[uploadScreenshot]", error);
    return null;
  }

  const { data } = db.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

/**
 * Delete a screenshot by its public URL.
 */
export async function deleteScreenshot(publicUrl: string): Promise<boolean> {
  const db = createAdminClient();
  // Extract path from URL: everything after /trade-screenshots/
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return false;

  const path = publicUrl.slice(idx + marker.length);
  const { error } = await db.storage.from(BUCKET).remove([path]);
  if (error) { console.error("[deleteScreenshot]", error); return false; }
  return true;
}

/**
 * Attach a screenshot to a journal trade.
 * Deletes the old one if present.
 */
export async function attachTradeScreenshot(
  tradeId: string,
  currentScreenshotUrl: string | null,
  formData: FormData
): Promise<string | null> {
  // Delete old screenshot if exists
  if (currentScreenshotUrl) {
    await deleteScreenshot(currentScreenshotUrl);
  }

  const url = await uploadScreenshot(formData, "trades");
  if (!url) return null;

  await updateJournalTrade(tradeId, { screenshot_path: url });
  return url;
}
