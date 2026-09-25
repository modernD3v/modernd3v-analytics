import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const pagePort = 4173;
const snippet = readFileSync(new URL("../snippet/track.js", import.meta.url), "utf8");

function pageHtml(endpoint, mode) {
  const script = snippet.replace("https://analytics.example.invalid/e", endpoint);
  const prelude = mode === "fetch" ? "navigator.sendBeacon = undefined;" : "";
  return `<!DOCTYPE html>
<html>
<body>
<p id="ready">page ready</p>
<script>${prelude}${script}</script>
</body>
</html>`;
}

function listen(handler, port = 0) {
  const server = createServer(handler);
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

const pageServer = await listen((req, res) => {
  const requestUrl = new URL(req.url, "http://127.0.0.1");
  const endpoint = requestUrl.searchParams.get("endpoint");
  const mode = requestUrl.searchParams.get("mode");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(pageHtml(endpoint, mode));
}, pagePort);

async function runCase(browser, name, endpointServer, mode) {
  const endpoint = endpointServer
    ? "http://127.0.0.1:" + endpointServer.address().port + "/e"
    : "http://127.0.0.1:9/e";
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (msg) => {
    if (/uncaught|unhandled/i.test(msg.text())) errors.push(msg.text());
  });
  let url = "http://127.0.0.1:" + pagePort + "/?endpoint=" + encodeURIComponent(endpoint);
  if (mode) url += "&mode=" + mode;
  await page.goto(url);
  const text = await page.textContent("#ready");
  await page.close();
  const ok = text === "page ready" && errors.length === 0;
  console.log(name + ": " + (ok ? "pass" : "fail") + (errors.length ? " " + errors.join("; ") : ""));
  return ok;
}

const stopped = null;
const failing = await listen((req, res) => {
  res.writeHead(500, { "Content-Type": "text/plain" });
  res.end("no");
});
const hanging = await listen(() => {});

const browser = await chromium.launch();
const results = [];
results.push(await runCase(browser, "stopped", stopped));
results.push(await runCase(browser, "500", failing));
results.push(await runCase(browser, "hanging", hanging));
results.push(await runCase(browser, "fetch fallback", stopped, "fetch"));

const invalid = await browser.newPage();
const invalidErrors = [];
invalid.on("pageerror", (error) => invalidErrors.push(String(error)));
await invalid.goto(
  "http://127.0.0.1:" + pagePort + "/?endpoint=" + encodeURIComponent("http://[")
);
const invalidText = await invalid.textContent("#ready");
await invalid.close();
const invalidOk = invalidText === "page ready" && invalidErrors.length === 0;
console.log(
  "invalid endpoint: " +
    (invalidOk ? "pass" : "fail") +
    (invalidErrors.length ? " " + invalidErrors.join("; ") : "")
);
results.push(invalidOk);

await browser.close();
await new Promise((resolve) => pageServer.close(resolve));
await new Promise((resolve) => failing.close(resolve));
await new Promise((resolve) => hanging.close(resolve));

if (results.some((ok) => !ok)) process.exit(1);
