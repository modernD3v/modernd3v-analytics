import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

let hostname = "";
try {
  hostname = new URL(databaseUrl).hostname;
} catch {
  console.error("refusing DATABASE_URL that is not a URL");
  process.exit(1);
}

if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  console.error("refusing non-local database host");
  process.exit(1);
}

console.log("database host admitted");

const rows = [
  ["modernd3vforall", "/", null, "instagram", "post", "founding"],
  ["modernd3vforall", "/", null, "medium", "article", "founding"],
  ["modernd3vforall", "/", "www.linkedin.com", "linkedin", "dm", "founding"],
  ["modernd3vforall", "/", null, "insta", "post", "founding"],
  ["modernd3vforall", "/", "www.google.com", null, null, null],
  ["modernd3vforall", "/", null, null, null, null],
  ["modernd3vforall", "/about", "modernd3vforall.com", null, null, null],
  ["modernd3vforall", "/next", "www.modernd3vforall.com", "instagram", "post", "founding"],
  ["other-site", "/", null, "email", "dm", "module-one"],
  ["other-site", "/", "news.ycombinator.com", null, null, null],
  ["other-site", "/", null, null, null, null],
  ["other-site", "/inside", "other.example.test", null, null, null],
];

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("TRUNCATE events RESTART IDENTITY");
  for (const row of rows) {
    await client.query(
      `INSERT INTO events (site_id, path, referrer_host, utm_source, utm_medium, utm_campaign)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      row
    );
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

console.log("seeded");
