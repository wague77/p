export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req && req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  res.status(410).json({
    error: "Ce relais n'est plus utilisé. Le programme se charge dans l'atelier NOVA.",
  });
}
