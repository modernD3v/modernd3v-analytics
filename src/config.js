const productionOrigins = {
  "https://modernd3vforall.com": "modernd3vforall",
  "https://www.modernd3vforall.com": "modernd3vforall",
};

const testOrigins = {
  "http://127.0.0.1:4173": "modernd3vforall",
  "http://localhost:4173": "modernd3vforall",
  "https://other.example.test": "other-site",
};

export const allowedTags = {
  utm_source: ["instagram", "medium", "linkedin", "email"],
  utm_medium: ["post", "story", "bio", "article", "dm"],
  utm_campaign: ["founding", "module-one", "free-chapter"],
};

export function originsForEnv(nodeEnv) {
  if (nodeEnv === "development" || nodeEnv === "test") {
    return { ...productionOrigins, ...testOrigins };
  }
  return { ...productionOrigins };
}

export function hostsBySite(origins) {
  const hosts = {};
  for (const [origin, siteId] of Object.entries(origins)) {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (!hosts[siteId]) hosts[siteId] = new Set();
    hosts[siteId].add(hostname);
  }
  return hosts;
}
