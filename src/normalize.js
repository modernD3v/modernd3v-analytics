const TAG_MAX = 100;
const PATH_MAX = 2048;

function tag(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, TAG_MAX);
  return trimmed || null;
}

export function normalizePath(value) {
  if (typeof value !== "string") return null;
  let text = value.trim();
  if (!text) return null;
  const hashAt = text.indexOf("#");
  if (hashAt !== -1) text = text.slice(0, hashAt);
  const queryAt = text.indexOf("?");
  if (queryAt !== -1) text = text.slice(0, queryAt);
  text = text.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) {
    try {
      text = new URL(text).pathname || "/";
    } catch {
      return null;
    }
  }
  if (!text.startsWith("/")) text = "/" + text;
  return text.slice(0, PATH_MAX);
}

export function referrerHost(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : "http://" + trimmed;
    const hostname = new URL(withScheme).hostname.toLowerCase();
    if (!hostname) return null;
    return hostname.slice(0, 255);
  } catch {
    return null;
  }
}

export function normalizeEvent(body) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const path = normalizePath(parsed.path);
  if (!path) return null;
  return {
    path,
    referrerHost: referrerHost(parsed.referrer),
    utmSource: tag(parsed.utm_source),
    utmMedium: tag(parsed.utm_medium),
    utmCampaign: tag(parsed.utm_campaign),
  };
}
