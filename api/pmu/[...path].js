const HOST = ["offline", "turfinfo", "api", "pmu", "fr"].join(".");
const PREFIX = ["", "rest", "client", "7", "programme", ""].join("/");

function cleanPath(raw) {
  return String(raw || "")
    .replace(/^\/+/, "")
    .split("?")[0]
    .split("#")[0];
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Méthode refusée" }));
    return;
  }

  const query = req.query || {};
  const raw = Array.isArray(query.path) ? query.path.join("/") : String(query.path || "");
  const path = cleanPath(raw);
  if (!/^\d{8}(?:\/R\d+\/C\d+\/[a-z0-9-]+)?$/i.test(path)) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Chemin PMU invalide" }));
    return;
  }

  const target = "https://" + HOST + PREFIX + path;
  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "PartantsPMU/1.0",
      },
    });
    const text = await upstream.text();
    res.statusCode = upstream.ok ? 200 : upstream.status || 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=30");
    res.end(text || "{}");
  } catch (err) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Service PMU injoignable" }));
  }
};
