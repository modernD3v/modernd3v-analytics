import express from "express";
import pg from "pg";
import { originsForEnv } from "./config.js";
import { normalizeEvent } from "./normalize.js";

const databaseUrl = process.env.DATABASE_URL;
const origins = originsForEnv(process.env.NODE_ENV);
const pool = databaseUrl
  ? new pg.Pool({ connectionString: databaseUrl, max: 1 })
  : null;
const app = express();

app.disable("x-powered-by");
app.use(express.text({ type: "text/plain", limit: "1kb" }));

app.post("/e", async (req, res) => {
  const origin = req.get("origin");
  const siteId = origin && origins[origin];
  if (!siteId) {
    res.status(403).end();
    return;
  }
  const event = normalizeEvent(req.body);
  if (!event) {
    res.status(400).end();
    return;
  }
  if (!pool) {
    res.status(500).end();
    return;
  }
  try {
    await pool.query(
      `INSERT INTO events (site_id, path, referrer_host, utm_source, utm_medium, utm_campaign)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [siteId, event.path, event.referrerHost, event.utmSource, event.utmMedium, event.utmCampaign]
    );
  } catch {
    res.status(500).end();
    return;
  }
  res.status(204).end();
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = err.status || err.statusCode;
  res.status(status === 413 ? 413 : 400).end();
});

const isDirectRun = process.argv[1] && process.argv[1].endsWith("server.js");
if (isDirectRun) {
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, () => {
    console.log("listening");
  });
  server.on("close", () => pool.end());
}

export default app;
