import { readFileSync } from "node:fs";

const fileUrl = new URL("../.env.prod-read", import.meta.url);
let text;
try {
  text = readFileSync(fileUrl, "utf8");
} catch {
  console.error(".env.prod-read is required");
  process.exit(1);
}

for (const line of text.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

await import("../src/visits.js");
