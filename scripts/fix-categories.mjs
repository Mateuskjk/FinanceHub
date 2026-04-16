import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env"), "utf-8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
    .filter(([k]) => k)
);

const supabase = createClient(env["VITE_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"], {
  auth: { autoRefreshToken: false, persistSession: false },
});

// name fixes: db value -> correct value with accent
const RENAMES = {
  "Saude":     "Saúde",
  "Educacao":  "Educação",
  "Compras":   "Compras",   // already correct, no-op
  "Salario":   "Salário",
  "Alimentacao": "Alimentação",
};

// New categories to add for every user
const NEW_CATS = [
  { name: "Poupança", type: "expense", icon: "piggy-bank",  color: "#2196f3", sort_order: 10 },
  { name: "Academia", type: "expense", icon: "dumbbell",    color: "#e06038", sort_order: 11 },
];

async function run() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  console.log(`Users: ${users.length}`);

  for (const user of users) {
    console.log(`\n→ ${user.email}`);

    // 1. Fix names with accents
    for (const [from, to] of Object.entries(RENAMES)) {
      if (from === to) continue;
      const { data, error } = await supabase
        .from("categories")
        .update({ name: to })
        .eq("user_id", user.id)
        .eq("name", from)
        .select("id");
      if (error) console.error(`  ✗ rename ${from}:`, error.message);
      else if (data?.length) console.log(`  ✓ renamed "${from}" → "${to}"`);
    }

    // 2. Add new categories (skip if already exists)
    for (const cat of NEW_CATS) {
      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", cat.name)
        .eq("type", cat.type);

      if (existing?.length) {
        console.log(`  – "${cat.name}" already exists, skipping`);
        continue;
      }

      const { error } = await supabase.from("categories").insert({
        user_id: user.id,
        ...cat,
        is_default: true,
      });
      if (error) console.error(`  ✗ insert ${cat.name}:`, error.message);
      else console.log(`  ✓ added "${cat.name}"`);
    }
  }

  console.log("\n🎉 Done!");
}

run().catch((e) => { console.error(e.message); process.exit(1); });
