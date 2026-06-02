import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.SUPABASE_DB_URL;
const caPath = process.env.SUPABASE_DB_SSL_CA_PATH || "data/prod-ca-2021.crt";

if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

if (!existsSync(caPath)) {
  console.error(`Missing Supabase CA cert: ${caPath}`);
  process.exit(1);
}

const sql = `
create table if not exists public.codex_connection_test (
  id uuid primary key default gen_random_uuid(),
  note text not null,
  created_at timestamptz not null default now()
);

insert into public.codex_connection_test (note)
values ('created from TennisTW smoke test')
returning id, note, created_at;
`;

const result = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-c", sql], {
  stdio: "inherit",
  env: {
    ...process.env,
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: caPath,
  },
});

process.exit(result.status ?? 1);
