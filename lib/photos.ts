// lib/photos.ts
import { supabase } from "@/lib/supabase";
import { decode as base64ToArrayBuffer } from "base64-arraybuffer";

export type UploadResult = {
  id: string;
  storage_path: string; // matches DB column name
};

export type UploadArgs = {
  base64: string; // raw base64 ONLY (no data:image/... prefix)
  ext?: "jpg" | "jpeg" | "png" | "webp";
  kind?: "original" | "processed" | "thumbnail";
};

const BUCKET = "user-photos";

function contentTypeFromExt(ext: string) {
  const e = ext.toLowerCase();
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  return "image/jpeg";
}

function stripDataUrlPrefix(b64: string) {
  const s = String(b64 || "").trim();
  const comma = s.indexOf(",");
  if (s.startsWith("data:") && comma !== -1) return s.slice(comma + 1);
  return s;
}

function safeExt(ext?: string): "jpg" | "jpeg" | "png" | "webp" {
  const e = String(ext || "").toLowerCase();
  if (e === "jpeg") return "jpeg";
  if (e === "png") return "png";
  if (e === "webp") return "webp";
  return "jpg";
}

function makeFileName(ext: string) {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
}

async function getUserIdOrThrow() {
  // Prefer session (fast, no network)
  const sessionRes = await supabase.auth.getSession();
  const uid = sessionRes.data?.session?.user?.id;
  if (uid) return uid;

  // Fallback
  const userRes = await supabase.auth.getUser();
  if (userRes.error) throw userRes.error;

  const uid2 = userRes.data?.user?.id;
  if (!uid2) throw new Error("Not authenticated");
  return uid2;
}

function formatSupabaseError(e: any) {
  const msg = e?.message || String(e || "Unknown error");
  const code = e?.code ? ` (code: ${e.code})` : "";
  const hint =
    msg.toLowerCase().includes("row-level security") ||
    msg.toLowerCase().includes("violates row level security") ||
    e?.code === "42501"
      ? " RLS blocked this. Check your user_photos INSERT policy and storage.objects INSERT policy for bucket 'user-photos'."
      : "";
  return `${msg}${code}${hint}`;
}

/**
 * Uploads an image to Storage + inserts a row into public.user_photos
 * Table columns assumed (per your screenshot):
 * - id (uuid)
 * - user_id (uuid)
 * - storage_path (text)
 * - kind (text)
 * - created_at (timestamptz)
 */
export async function uploadUserPhotoBase64(args: UploadArgs): Promise<UploadResult> {
  const raw = stripDataUrlPrefix(args.base64);
  const ext = safeExt(args.ext);
  const kind = args.kind ?? "original";

  if (!raw) throw new Error("Missing base64 image data");

  const userId = await getUserIdOrThrow();
  const arrayBuffer = base64ToArrayBuffer(raw);

  const filename = makeFileName(ext);
  // Folder convention: `${userId}/${kind}/${filename}`
  const storagePath = `${userId}/${kind}/${filename}`;

  // 1) Upload to storage
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: contentTypeFromExt(ext),
    upsert: false,
    cacheControl: "3600",
  });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${formatSupabaseError(uploadErr)}`);
  }

  // 2) Insert DB row (ONLY columns that exist)
  const { data: row, error: dbErr } = await supabase
    .from("user_photos")
    .insert({
      user_id: userId,
      storage_path: storagePath,
      kind,
    } as any)
    .select("id, storage_path")
    .single();

  if (dbErr) {
    // Best-effort cleanup so we don’t orphan storage files
    try {
      await supabase.storage.from(BUCKET).remove([storagePath]);
    } catch (e) {
      console.log("🟨 cleanup remove failed:", e);
    }
    throw new Error(`user_photos insert failed: ${formatSupabaseError(dbErr)}`);
  }

  return row as UploadResult;
}

/**
 * Public URL (works only if bucket is public).
 * If bucket is private (recommended), use signed URLs.
 */
export function getUserPhotoPublicUrl(storagePath: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function getUserPhotoSignedUrl(storagePath: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error) throw new Error(`createSignedUrl failed: ${formatSupabaseError(error)}`);
  return data.signedUrl;
}