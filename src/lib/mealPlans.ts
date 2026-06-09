/**
 * Meal plans - coach uploads PDFs for clients (Trainerize-style).
 * Bucket: meal-plans   Path: <client_id>/<timestamp>_<filename>.pdf
 * Metadata in public.meal_plans.
 */

import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

const BUCKET = "meal-plans";
const MAX_BYTES = 20 * 1024 * 1024; // matches storage bucket limit

export type MealPlan = {
  id: string;
  client_id: string;
  coach_id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number | null;
  uploaded_at: string;
};

export type CoachClientLite = {
  client_id: string;
  display_name: string;
};

/** Active clients of the signed-in coach, for the upload picker. */
export async function fetchActiveClientsForCoach(): Promise<CoachClientLite[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("coach_clients")
    .select("client_id, profiles:client_id(first_name, email)")
    .eq("coach_id", user.id)
    .eq("status", "active");

  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => ({
    client_id: row.client_id as string,
    display_name:
      (row.profiles?.first_name as string) ??
      (row.profiles?.email as string) ??
      "Client",
  }));
}

/** Whether the signed-in user has a row in `coaches`. */
export async function isSignedInUserCoach(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from("coaches")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/**
 * Upload a PDF to the meal-plans bucket and create a meal_plans row.
 * The signed-in user must be a coach OR uploading for themselves; storage
 * RLS enforces that. `clientId` controls which client sees the plan.
 */
export async function uploadMealPlan(args: {
  uri: string;
  fileName: string;
  fileSize: number | null;
  title: string;
  clientId: string;
}): Promise<MealPlan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  if (args.fileSize != null && args.fileSize > MAX_BYTES) {
    throw new Error("File exceeds 20 MB limit");
  }

  // Sanitize filename (storage paths are URL-encoded but keep it tame).
  const safeName = args.fileName.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${args.clientId}/${Date.now()}_${safeName}`;

  // RN: read file as base64, decode to ArrayBuffer for upload.
  const base64 = await FileSystem.readAsStringAsync(args.uri, {
    encoding: "base64",
  });
  const arrayBuffer = decode(base64);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: row, error: insertError } = await supabase
    .from("meal_plans")
    .insert({
      client_id: args.clientId,
      coach_id: user.id,
      title: args.title.trim() || safeName.replace(/\.pdf$/i, ""),
      storage_path: storagePath,
      file_size_bytes: args.fileSize ?? null,
    } as never)
    .select("*")
    .single();

  if (insertError) {
    // Best-effort cleanup if the row insert failed.
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    throw insertError;
  }

  return row as MealPlan;
}

export async function deleteMealPlan(args: {
  id: string;
  storagePath: string;
}): Promise<void> {
  await supabase.storage.from(BUCKET).remove([args.storagePath]);
  const { error } = await supabase.from("meal_plans").delete().eq("id", args.id);
  if (error) throw error;
}
