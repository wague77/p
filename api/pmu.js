const HOSTS = [
  "https://offline.turfinfo.api.pmu.fr/rest/client/7/programme/",
  "https://online.turfinfo.api.pmu.fr/rest/client/7/programme/",
  "https://online.turfinfo.api.pmu.fr/rest/client/61/programme/",
  "https://online.turfinfo.api.pmu.fr/rest/client/1/programme/",
];

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
  try {
    const q = req && req.query ? req.query.path : "";
    if (Array.isArray(q)) return String(q[0] || "");
    if (q) return String(q);
  } catch {
    /* query absente */
  }
  try {
    const raw = String((req && req.url) || "/");
    const withHost = raw.indexOf("http") === 0 ? raw : "https://partants.local" + (raw.charAt(0) === "/" ? raw : "/" + raw);
    const url = new URL(withHost);
    return String(url.searchParams.get("path") || "");
  } catch {
    return "";
  }
}

function extractJson(text) {
  const raw = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!raw) return "";
  if (raw.charAt(0) === "{" || raw.charAt(0) === "[") return raw;
  const startObj = raw.indexOf("{");
  const startArr = raw.indexOf("[");
  const starts = [startObj, startArr].filter((n) => n >= 0);
  if (!starts.length) return "";
  const start = Math.min.apply(null, starts);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (end <= start) return "";
  return raw.slice(start, end + 1);
}

function looksUseful(text) {
  const json = extractJson(text);
  if (!json || json.length < 20) return "";
  if (
    json.indexOf("reunions") < 0 &&
    json.indexOf("participants") < 0 &&
    json.indexOf("selection") < 0 &&
    json.indexOf("commentaire") < 0 &&
    json.indexOf("hippodrome") < 0
  ) {
    return "";
  }
  return json;
}

async function pull(url) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => {
    if (ctrl) ctrl.abort();
  }, 8000);
  try {
    const upstream = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl ? ctrl.signal : undefined,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "fr-FR,fr;q=0.9",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.pmu.fr/",
        Origin: "https://www.pmu.fr",
      },
    });
    const status = Number(upstream && upstream.status);
    if (!upstream || status >= 400) return "";
    return looksUseful(await upstream.text());
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cache-Control", "public, max-age=45");
  if (req && req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  const path = allowedPath(readQuery(req));
  if (!path) {
    res.status(400).json({ error: "Chemin PMU refusé." });
    return;
  }
  const targets = HOSTS.map((base) => base + path);
  if (path.indexOf("/") < 0) {
    targets.push(
      "https://online.turfinfo.api.pmu.fr/rest/client/1/programme/" + path + "?specialisation=INTERNET"
    );
  }
  for (const target of targets) {
    const json = await pull(target);
    if (json) {
      res.status(200);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(json);
      return;
    }
  }
  const encoded = encodeURIComponent(targets[0]);
  const mirrors = [
    "https://api.allorigins.win/raw?url=" + encoded,
    "https://corsproxy.io/?" + encoded,
  ];
  for (const mirror of mirrors) {
    const json = await pull(mirror);
    if (json) {
      res.status(200);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(json);
      return;
    }
  }
  res.status(200).json({ reunions: [], programme: { reunions: [] }, offline: true });
}
