import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

const maxBytes = 4 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

export default async (request) => {
  // Netlify rotates the Blobs context token for each invocation. Create a
  // store for this request so a warm function never reuses an expired token.
  const mediaStore = getStore("igjvlab-media");
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (request.method === "GET") {
    if (!key || !/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(key)) return new Response("Not found", { status: 404 });
    const result = await mediaStore.getWithMetadata(key, { type: "arrayBuffer" });
    if (!result?.data) return new Response("Not found", { status: 404 });
    return new Response(result.data, {
      headers: {
        "content-type": result.metadata?.contentType || "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  }

  if (request.method !== "POST") return json({ error: "Metode tidak didukung." }, 405);
  const user = await getUser();
  if (!user) return json({ error: "Silakan login untuk mengunggah gambar." }, 401);

  let form;
  try { form = await request.formData(); }
  catch { return json({ error: "Form unggahan tidak valid." }, 400); }
  const file = form.get("image");
  if (!file || typeof file.arrayBuffer !== "function") return json({ error: "Pilih gambar terlebih dahulu." }, 400);
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
    return json({ error: "Gunakan gambar JPG, PNG, atau WebP." }, 415);
  }
  if (file.size > maxBytes) return json({ error: "Ukuran gambar harus di bawah 4 MB." }, 413);

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const imageKey = `${crypto.randomUUID()}.${extension}`;
  await mediaStore.set(imageKey, await file.arrayBuffer(), { metadata: { contentType: file.type } });
  return json({ key: imageKey, url: `/.netlify/functions/media?key=${encodeURIComponent(imageKey)}` }, 201);
};
