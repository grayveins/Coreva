/**
 * Progress photos - upload, list, delete helpers.
 * Photos live in the `progress-photos` storage bucket under {user_id}/...
 * Metadata in the public.progress_photos table.
 */

import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

export type ProgressPose = "front" | "side" | "back" | "other";

export type ProgressPhoto = {
  id: string;
  client_id: string;
  storage_path: string;
  pose: ProgressPose | null;
  notes: string | null;
  taken_at: string;
  created_at: string;
};

const BUCKET = "progress-photos";
const MAX_DIMENSION = 1080;
const JPEG_QUALITY = 0.8;

async function compress(uri: string): Promise<{ uri: string; width: number; height: number }> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: SaveFormat.JPEG }
  );
  return result;
}

export async function uploadProgressPhoto(args: {
  uri: string;
  pose: ProgressPose;
  takenAt?: Date;
  notes?: string;
}): Promise<{ row: ProgressPhoto; storagePath: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const compressed = await compress(args.uri);

  const date = (args.takenAt ?? new Date()).toISOString().slice(0, 10);
  const filename = `${args.pose}_${Date.now()}.jpg`;
  const storagePath = `${user.id}/${date}/${filename}`;

  // React Native: read the file as base64 and upload as ArrayBuffer.
  // (fetch().blob() doesn't work reliably in RN; this is the supported
  // Supabase Storage pattern for Expo apps.)
  const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
    encoding: "base64",
  });
  const arrayBuffer = decode(base64);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: row, error: insertError } = await supabase
    .from("progress_photos")
    .insert({
      client_id: user.id,
      storage_path: storagePath,
      pose: args.pose,
      notes: args.notes ?? null,
      taken_at: date,
    } as never)
    .select("*")
    .single();

  if (insertError) throw insertError;
  return { row: row as ProgressPhoto, storagePath };
}

export async function listOwnProgressPhotos(): Promise<ProgressPhoto[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("client_id", user.id)
    .order("taken_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProgressPhoto[];
}

export async function getSignedPhotoUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function listOwnProgressPhotosWithUrls(): Promise<
  Array<ProgressPhoto & { url: string | null }>
> {
  const rows = await listOwnProgressPhotos();
  if (rows.length === 0) return [];
  const paths = rows.map((r) => r.storage_path);
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 3600);
  const urlByPath = new Map<string, string>();
  (signed ?? []).forEach((s, i) => {
    if (s.signedUrl) urlByPath.set(paths[i], s.signedUrl);
  });
  return rows.map((r) => ({ ...r, url: urlByPath.get(r.storage_path) ?? null }));
}

export async function deleteProgressPhoto(args: {
  id: string;
  storagePath: string;
}): Promise<void> {
  // Storage RLS lets the owning client delete; the row delete is then
  // safe via RLS (Clients manage own intake / progress photos).
  await supabase.storage.from(BUCKET).remove([args.storagePath]);
  const { error } = await supabase.from("progress_photos").delete().eq("id", args.id);
  if (error) throw error;
}
