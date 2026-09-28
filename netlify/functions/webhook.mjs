import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore({ name: "requests", consistency: "strong" });

  if (new URL(req.url).pathname === "/") {
    const { blobs } = await store.list();
    const entries = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return new Response(JSON.stringify(entries, null, 2), {
      headers: { "content-type": "application/json" },
    });
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
