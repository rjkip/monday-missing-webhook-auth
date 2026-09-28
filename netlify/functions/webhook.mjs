import { getStore } from "@netlify/blobs";

// Paths browsers and crawlers request on their own; not worth recording.
const IGNORED = /^\/(favicon\.ico|robots\.txt|sitemap\.xml|apple-touch-icon.*\.png|\.well-known\/.*)$/;

const escape = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const pretty = (body) => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};

export default async (req) => {
  const store = getStore({ name: "requests", consistency: "strong" });
  const { pathname } = new URL(req.url);

  if (IGNORED.test(pathname)) return new Response("Not found", { status: 404 });

  if (pathname === "/") {
    const { blobs } = await store.list();
    const entries = (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" }))))
      .filter((e) => !IGNORED.test(new URL(e.url).pathname))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const items = entries
      .map(
        (e) => `<section>
<h2>${escape(e.timestamp)} &middot; ${escape(e.method)} ${escape(e.url)}</h2>
<pre>${escape(Object.entries(e.headers).map(([k, v]) => `${k}: ${v}`).join("\n"))}</pre>
<pre>${escape(pretty(e.body)) || "<i>(empty body)</i>"}</pre>
</section>`,
      )
      .join("\n");
    return new Response(
      `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Requests</title>
<style>
body { font-family: system-ui, sans-serif; margin: 1rem; }
h2 { font-size: 1rem; word-break: break-all; }
pre { background: #f4f4f4; padding: .5rem; overflow-x: auto; }
section { border-top: 1px solid #ccc; }
</style>
<h1>Requests (${entries.length})</h1>
${items || "<p>No requests yet.</p>"}`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  const timestamp = new Date().toISOString();
  const body = await req.text();
  await store.setJSON(`${timestamp}-${crypto.randomUUID()}`, {
    timestamp,
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers),
    body,
  });

  let challenge;
  try {
    challenge = JSON.parse(body).challenge;
  } catch {}
  if (challenge) return Response.json({ challenge });
  return new Response("ok");
};

export const config = { path: ["/", "/*"] };
