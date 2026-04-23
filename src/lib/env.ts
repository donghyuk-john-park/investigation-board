export function getMissingSupabaseEnvVars() {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return missing;
}

export function hasSupabaseEnv() {
  return getMissingSupabaseEnvVars().length === 0;
}
