import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function requiredEnv(name, fallbackName) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "");
}

function printResult(ok, label, detail = "") {
  const mark = ok ? "OK" : "FAIL";
  console.log(`${mark} ${label}${detail ? ` - ${detail}` : ""}`);
}

loadEnvFile(envPath);

const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const key = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const teacherEmail = requiredEnv("NEXT_PUBLIC_TEACHER_LOGIN_EMAIL");

if (!url || !key) {
  printResult(false, "Supabase env", "missing NEXT_PUBLIC_SUPABASE_URL and/or public key in .env.local");
  process.exit(1);
}

printResult(true, "Supabase env", url);
printResult(Boolean(teacherEmail), "Teacher login email", teacherEmail || "missing NEXT_PUBLIC_TEACHER_LOGIN_EMAIL");

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const tableChecks = [
  "classrooms",
  "students",
  "student_photos",
  "groups",
  "subjects",
  "star_events",
  "random_logs"
];

let failed = false;

const authResult = await supabase.auth.getSession();
printResult(!authResult.error, "Auth endpoint", authResult.error?.message ?? "reachable");
failed = failed || Boolean(authResult.error);

for (const table of tableChecks) {
  const { error } = await supabase.from(table).select("id", { count: "exact", head: true });
  const expectedRlsBlock = error && /permission denied|row-level security|jwt|invalid api key|not authorized/i.test(error.message);
  const ok = !error || expectedRlsBlock;
  printResult(ok, `Table ${table}`, error ? `RLS/public read blocked as expected or auth required: ${error.message}` : "reachable");
  failed = failed || !ok;
}

const { error: classroomImageColumnError } = await supabase.from("classrooms").select("id,image_url").limit(1);
printResult(!classroomImageColumnError, "Column classrooms.image_url", classroomImageColumnError?.message ?? "reachable");
failed = failed || Boolean(classroomImageColumnError);

const { error: rpcError } = await supabase.rpc("get_student_score_by_code", { lookup_code: "__codex_check__" });
printResult(!rpcError, "RPC get_student_score_by_code", rpcError?.message ?? "reachable");
failed = failed || Boolean(rpcError);

for (const bucket of ["student-photos", "group-icons", "classroom-images"]) {
  const { data } = supabase.storage.from(bucket).getPublicUrl("__codex_check__.png");
  printResult(Boolean(data.publicUrl), `Storage bucket ${bucket}`, data.publicUrl ? "public URL can be generated" : "not available");
  failed = failed || !data.publicUrl;
}

if (failed) {
  console.log("\nSupabase check found a problem. Re-run supabase/schema.sql or the latest file in supabase/fixes in SQL Editor, then run this command again.");
  process.exit(1);
}

console.log("\nSupabase connection looks ready. Next: create/login teacher Auth user and run npm run dev.");
