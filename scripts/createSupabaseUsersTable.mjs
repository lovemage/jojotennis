import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.SUPABASE_DB_URL;
const caPath = process.env.SUPABASE_DB_SSL_CA_PATH || "data/prod-ca-2021.crt";
const migrationPath = "supabase/migrations/0003_create_users_if_missing.sql";

if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

if (!existsSync(caPath)) {
  console.error(`Missing Supabase CA cert: ${caPath}`);
  process.exit(1);
}

if (!existsSync(migrationPath)) {
  console.error(`Missing migration: ${migrationPath}`);
  process.exit(1);
}

const result = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", migrationPath], {
  stdio: "inherit",
  env: {
    ...process.env,
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: caPath,
  },
});

if (result.status !== 0) {
  console.error(
    [
      "",
      "Supabase users table migration failed.",
      "If the error says IPv6 is unreachable, replace SUPABASE_DB_URL with the Supabase pooler connection string from:",
      "Dashboard → Project Settings → Database → Connection string → Session pooler or Transaction pooler.",
    ].join("\n"),
  );
}

process.exit(result.status ?? 1);
