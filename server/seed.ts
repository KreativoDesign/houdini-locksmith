/**
 * Seed script — run once to populate fixed reference data.
 * Called automatically on first startup via the departments.seed endpoint,
 * or manually via: npx tsx server/seed.ts
 */
import { seedDepartments } from "./db";

async function main() {
  console.log("[Seed] Seeding departments...");
  await seedDepartments();
  console.log("[Seed] Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
