import pg from "pg";
import { allowedTags, hostsBySite, originsForEnv } from "./config.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

function parseArgs(argv) {
  const args = { site: null, from: null, to: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--site") args.site = argv[++i];
    else if (argv[i] === "--from") args.from = argv[++i];
    else if (argv[i] === "--to") args.to = argv[++i];
  }
  return args;
}

function utcDate(date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const now = new Date();
  const to = utcDate(now);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
  return { from: utcDate(start), to };
}

function isTagged(row) {
  return row.utm_source || row.utm_medium || row.utm_campaign;
}

const args = parseArgs(process.argv.slice(2));
const range = defaultRange();
const from = args.from || range.from;
const to = args.to || range.to;
const fromIso = from + "T00:00:00.000Z";
const toDate = new Date(to + "T00:00:00.000Z");
toDate.setUTCDate(toDate.getUTCDate() + 1);
const toIso = toDate.toISOString();

const hosts = hostsBySite(originsForEnv(process.env.NODE_ENV));
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
const result = await client.query(
  `SELECT site_id, referrer_host, utm_source, utm_medium, utm_campaign
   FROM events
   WHERE created_at >= $1 AND created_at < $2
     AND ($3::text IS NULL OR site_id = $3)
   ORDER BY site_id, id`,
  [fromIso, toIso, args.site]
);
await client.end();

const bySite = new Map();
for (const row of result.rows) {
  if (!bySite.has(row.site_id)) bySite.set(row.site_id, []);
  bySite.get(row.site_id).push(row);
}

if (bySite.size === 0) {
  console.log("no visits");
  process.exit(0);
}

for (const [siteId, rows] of bySite) {
  const siteHosts = hosts[siteId] || new Set();
  const sources = new Map();
  const referrers = new Map();
  const warnings = new Map();
  let internal = 0;

  for (const row of rows) {
    const ownHost = row.referrer_host && siteHosts.has(row.referrer_host);
    if (ownHost) {
      internal += 1;
      continue;
    }
    if (isTagged(row)) {
      const source = row.utm_source || "(none)";
      const medium = row.utm_medium || "(none)";
      const campaign = row.utm_campaign || "(none)";
      if (!sources.has(source)) sources.set(source, new Map());
      const key = medium + " / " + campaign;
      sources.get(source).set(key, (sources.get(source).get(key) || 0) + 1);
      for (const [field, value] of [
        ["utm_source", row.utm_source],
        ["utm_medium", row.utm_medium],
        ["utm_campaign", row.utm_campaign],
      ]) {
        if (value && !allowedTags[field].includes(value)) {
          const warningKey = field + ' "' + value + '"';
          warnings.set(warningKey, (warnings.get(warningKey) || 0) + 1);
        }
      }
    } else {
      const host = row.referrer_host || "(none)";
      referrers.set(host, (referrers.get(host) || 0) + 1);
    }
  }

  console.log("site: " + siteId);
  console.log("landing by source");
  if (sources.size === 0) console.log("  (none)");
  for (const [source, tags] of sources) {
    console.log("  " + source);
    for (const [key, count] of tags) {
      console.log("    " + key + ": " + count);
    }
  }
  console.log("untagged landings by referrer");
  if (referrers.size === 0) console.log("  (none)");
  for (const [host, count] of referrers) {
    console.log("  " + host + ": " + count);
  }
  console.log("internal page views: " + internal);
  for (const [warning, count] of warnings) {
    console.log("warning: " + warning + " is not on the allowed list: " + count);
  }
  console.log("");
}
