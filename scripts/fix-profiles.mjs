// Temporary script to fix missing profiles in Supabase.
// Run once with: node scripts/fix-profiles.mjs
// Then delete this file and remove SUPABASE_SERVICE_ROLE_KEY from .env

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env manually (no dotenv needed)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
    .filter(([k]) => k)
);

const supabaseUrl = env["VITE_SUPABASE_URL"];
const serviceRoleKey = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("🔧 Conectando ao Supabase...");

  // 1. List all auth users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) throw usersError;
  console.log(`👥 Usuários encontrados: ${users.length}`);

  // 2. List existing profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id");
  if (profilesError) throw profilesError;
  const existingIds = new Set(profiles.map((p) => p.id));

  // 3. Create missing profiles
  const missing = users.filter((u) => !existingIds.has(u.id));
  if (missing.length === 0) {
    console.log("✅ Todos os usuários já têm profile.");
  } else {
    const inserts = missing.map((u) => ({
      id: u.id,
      full_name: u.user_metadata?.full_name ?? null,
      avatar_url: u.user_metadata?.avatar_url ?? null,
    }));
    const { error: insertError } = await supabase.from("profiles").insert(inserts);
    if (insertError) throw insertError;
    console.log(`✅ ${missing.length} profile(s) criado(s).`);
  }

  // 4. Seed default categories for users that have none
  const { data: catUsers, error: catError } = await supabase
    .from("categories")
    .select("user_id");
  if (catError) throw catError;
  const usersWithCats = new Set(catUsers.map((c) => c.user_id));

  const needsCats = users.filter((u) => !usersWithCats.has(u.id));
  if (needsCats.length === 0) {
    console.log("✅ Todos os usuários já têm categorias.");
  } else {
    const defaultCategories = [
      { name: "Salario",       type: "income",  icon: "money-bag",    color: "#18b470", is_default: true, sort_order: 1 },
      { name: "Freelance",     type: "income",  icon: "laptop",       color: "#26cc80", is_default: true, sort_order: 2 },
      { name: "Investimentos", type: "income",  icon: "chart-up",     color: "#c9a422", is_default: true, sort_order: 3 },
      { name: "Outros",        type: "income",  icon: "pin",          color: "#7c58e8", is_default: true, sort_order: 4 },
      { name: "Alimentacao",   type: "expense", icon: "burger",       color: "#d44b23", is_default: true, sort_order: 1 },
      { name: "Transporte",    type: "expense", icon: "car",          color: "#6640cc", is_default: true, sort_order: 2 },
      { name: "Moradia",       type: "expense", icon: "house",        color: "#be55e0", is_default: true, sort_order: 3 },
      { name: "Lazer",         type: "expense", icon: "game",         color: "#c9a422", is_default: true, sort_order: 4 },
      { name: "Saude",         type: "expense", icon: "pill",         color: "#18b470", is_default: true, sort_order: 5 },
      { name: "Educacao",      type: "expense", icon: "books",        color: "#e06038", is_default: true, sort_order: 6 },
      { name: "Compras",       type: "expense", icon: "shopping-bag", color: "#d4a830", is_default: true, sort_order: 7 },
      { name: "Contas",        type: "expense", icon: "document",     color: "#73778c", is_default: true, sort_order: 8 },
      { name: "Outros",        type: "expense", icon: "pin",          color: "#8c8fa4", is_default: true, sort_order: 9 },
    ];

    for (const u of needsCats) {
      const rows = defaultCategories.map((c) => ({ ...c, user_id: u.id }));
      const { error: seedError } = await supabase
        .from("categories")
        .upsert(rows, { onConflict: "user_id,name,type", ignoreDuplicates: true });
      if (seedError) throw seedError;
      console.log(`  🗂  Categorias criadas para ${u.email}`);
    }
  }

  console.log("\n🎉 Pronto! Pode tentar salvar a transação novamente.");
}

run().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
