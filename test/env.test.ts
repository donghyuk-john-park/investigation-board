import { afterEach, describe, expect, it } from "vitest";
import { getMissingSupabaseEnvVars, hasSupabaseEnv } from "@/lib/env";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  }

  if (originalAnonKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  }
});

describe("Supabase env helpers", () => {
  it("reports missing variables", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(getMissingSupabaseEnvVars()).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
    expect(hasSupabaseEnv()).toBe(false);
  });

  it("passes when both variables are present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    expect(getMissingSupabaseEnvVars()).toEqual([]);
    expect(hasSupabaseEnv()).toBe(true);
  });
});
