import { supabase } from "./supabase";

export async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (jwt) headers.set("Authorization", `Bearer ${jwt}`);
  const base = process.env.EXPO_PUBLIC_API_BASE!;
  return fetch(`${base}${path}`, { ...init, headers });
}
