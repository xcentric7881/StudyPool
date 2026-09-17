import fs from "node:fs";
import path from "node:path";
import { parseRosterCsv, replaceRoster } from "../lib/roster";
import { db } from "../lib/db";

const filename = process.argv[2];
if (!filename) {
  console.error("Usage: npm run roster:import -- /path/to/roster.csv");
  process.exit(1);
}

try {
  const csv = fs.readFileSync(filename, "utf8");
  const rows = parseRosterCsv(csv);
  await replaceRoster(rows, "command-line bootstrap", path.basename(filename));
  console.log(`Imported ${rows.length} roster entries.`);
} finally {
  await db.$disconnect();
}
