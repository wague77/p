const BASES = [
  "https://online.turfinfo.api.pmu.fr/rest/client/7/programme/",
  "https://online.turfinfo.api.pmu.fr/rest/client/61/programme/",
  "https://online.turfinfo.api.pmu.fr/rest/client/1/programme/",
  "https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/",
];

const BROWSER = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Referer: "https://www.pmu.fr/",
  Origin: "https://www.pmu.fr",
};

function allowedPath(raw) {
  const clean = String(raw || "")
    .replace(/^\/+/, "")
    .split("?")[0]
    .split("#")[0]
    .trim();
  if (!/^\d{8}(?:\/R\d+\/C\d+\/[a-z0-9-]+)?$/i.test(clean)) return "";
  return clean;
}

function readQuery(req) {
  const q = req && req.query ? req.query.path : "";
  if (Array.isArray(q)) return String(q[0] || "");
  if (q) return String(q);
  try {
    const host = "https://app.local";
    const url = new URL(String(req.url || "/"), host);
    return String(url.searchParams.get("path") || "");
  } catch {
    return "";
  }
}

async function pull(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: BROWSER,
      signal: ctrl.signal,
      redirect: "follow",
    });
    const text = await upstream.text();
    return { status: upstream.status, text: String(text || "") };
  } finally {
    clearTimeout(timer);
  }
}

function looksJson(text) {
  const trimmed = String(text || "").replace(/^\uFEFF/, "").trim();
  return trimmed.charAt(0) === "{" || trimmed.charAt(0) === "[";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode refusée." });
    return;
  }
  const path = allowedPath(readQuery(req));
  if (!path) {
    res.status(400).json({ error: "Chemin PMU refusé." });
    return;
  }
  let lastStatus = 0;
  for (const base of BASES) {
    try {
      const hit = await pull(base + path);
      lastStatus = hit.status;
      if (hit.status >= 200 && hit.status < 300 && looksJson(hit.text)) {
        res.status(200);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "s-maxage=45, stale-while-revalidate=120");
        res.send(hit.text);
        return;
      }
    } catch {
      lastStatus = lastStatus || 502;
    }
  }
  res.status(502).json({
    error: "Le service PMU a répondu " + String(lastStatus || 403) + ".",
  });
}
