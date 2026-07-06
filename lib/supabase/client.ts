import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";

  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}

export function getTeacherLoginEmail() {
  return process.env.NEXT_PUBLIC_TEACHER_LOGIN_EMAIL ?? "";
}

export function getSupabaseBrowserClient() {
  const { url, key } = getSupabaseEnv();

  if (!url || !key) {
    throw new Error("ยังไม่ได้ตั้งค่า Supabase ในไฟล์ .env.local");
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }

  return browserClient;
}
