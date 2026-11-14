import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

const sections = new Set(["events", "jobs", "projects", "network"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function defaultsFor(section, requestUrl) {
  const response = await fetch(new URL("/data/content.json", requestUrl));
  if (!response.ok) return [];
  const defaults = await response.json();
  return Array.isArray(defaults[section]) ? defaults[section] : [];
}

export default async (request) => {
  const url = new URL(request.url);
  const section = url.searchParams.get("section");
  if (!sections.has(section)) return json({ error: "Bagian konten tidak dikenal." }, 400);

  // Netlify rotates the Blobs context token for each invocation. Create a
  // store for this request so a warm function never reuses an expired token.
  const contentStore = getStore("igjvlab-content");
  const key = `section:${section}`;
  if (request.method === "GET") {
    const saved = await contentStore.get(key);
    if (saved) {
      try { return json(JSON.parse(saved)); }
      catch { return json({ error: "Data konten tersimpan tidak valid." }, 500); }
    }
    return json(await defaultsFor(section, request.url));
  }

  if (request.method !== "PUT") return json({ error: "Metode tidak didukung." }, 405);

  const user = await getUser();
  if (!user) return json({ error: "Silakan login untuk menyimpan konten." }, 401);

  let entries;
  try { entries = await request.json(); }
  catch { return json({ error: "Data yang dikirim tidak valid." }, 400); }
  if (!Array.isArray(entries) || entries.length > 250) {
    return json({ error: "Daftar konten tidak valid." }, 400);
  }

  await contentStore.set(key, JSON.stringify(entries));
  return json({ ok: true, count: entries.length });
};
