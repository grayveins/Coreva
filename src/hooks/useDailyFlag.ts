/**
 * useDailyFlag - local per-day boolean toggle backed by AsyncStorage.
 *
 * Used for self-tracked things ("I hit my macros today") that don't need
 * to round-trip the DB. Keys are scoped by user_id so test accounts /
 * sign-out / sign-in cycles don't bleed flags across users on the same
 * device.
 *
 * Key shape: `dailyFlag:<userId>:<name>:<ymd>`
 *
 * If userId is null/undefined the hook is inert - hydrates as false, toggle
 * is a no-op. Callers should fold this into their normal "userId resolved
 * yet?" gating.
 *
 * Legacy unscoped keys (`dailyFlag:<name>:<ymd>`) are swept once on
 * `clearLegacyDailyFlags()` (call from auth-resolve / sign-in path) to
 * stop them showing through to fresh accounts on the same device.
 */

import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const keyFor = (userId: string, name: string, ymd: string) =>
  `dailyFlag:${userId}:${name}:${ymd}`;

export function useDailyFlag(
  name: string,
  ymd: string,
  userId: string | null | undefined,
) {
  const [on, setOn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId) {
      setOn(false);
      setHydrated(true);
      return;
    }
    let cancelled = false;
    setHydrated(false);
    AsyncStorage.getItem(keyFor(userId, name, ymd))
      .then((v) => {
        if (!cancelled) {
          setOn(v === "1");
          setHydrated(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [name, ymd, userId]);

  const toggle = useCallback(async () => {
    if (!userId) return;
    const next = !on;
    setOn(next);
    try {
      await AsyncStorage.setItem(keyFor(userId, name, ymd), next ? "1" : "0");
    } catch {
      // Surface state already updated optimistically; revert if needed
      setOn(!next);
    }
  }, [name, ymd, userId, on]);

  return { on, hydrated, toggle };
}

/** Prefix bulk readers should use to scan a user's flags. */
export function dailyFlagPrefix(userId: string, name: string): string {
  return `dailyFlag:${userId}:${name}:`;
}

/**
 * Extract the YMD from a fully-qualified scoped key. Returns null when
 * the key isn't in the scoped shape (e.g. legacy unscoped keys).
 */
export function ymdFromDailyFlagKey(key: string): string | null {
  // dailyFlag:<userId>:<name>:<ymd>
  const parts = key.split(":");
  if (parts.length !== 4) return null;
  if (parts[0] !== "dailyFlag") return null;
  return parts[3];
}

/**
 * One-time cleanup: remove unscoped legacy keys (`dailyFlag:<name>:<ymd>`)
 * left on disk by previous app versions. Safe to call repeatedly. Run
 * from the auth router on sign-in so a fresh account doesn't see the
 * previous account's flags.
 */
export async function clearLegacyDailyFlags(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const legacy = allKeys.filter((k) => {
      if (!k.startsWith("dailyFlag:")) return false;
      // Scoped keys have 4 segments; legacy keys have 3.
      return k.split(":").length === 3;
    });
    if (legacy.length > 0) {
      await AsyncStorage.multiRemove(legacy);
    }
  } catch {
    // Cleanup is best-effort; failures are inert.
  }
}
