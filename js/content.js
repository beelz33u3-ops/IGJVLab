(function () {
  const api = "/.netlify/functions/content";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function safeUrl(value, fallback = "") {
    try {
      const candidate = typeof value === "string" && value.trim() ? value.trim() : fallback;
      if (!candidate) return "";
      const url = new URL(candidate, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
    } catch { return fallback; }
  }

  async function getItems(section) {
    const response = await fetch(`${api}?section=${encodeURIComponent(section)}`);
    if (!response.ok) throw new Error(`Tidak bisa memuat ${section}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  function renderEvents(items) {
    const target = document.getElementById("cms-event-list");
    if (!target) return;
    target.replaceChildren();
    if (!items.length) { target.append(el("p", "cms-empty-state", "Belum ada konten. Pengelola dapat menambahkan postingan melalui halaman CMS.")); return; }
    items.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).forEach((item) => {
      const article = el("article", "event-post-preview");
      const imageWrap = el("div", "event-post-image");
      const image = el("img");
      image.src = safeUrl(item.image, "images/hero.jpg");
      image.alt = item.title || "Foto kegiatan IGJVLab";
      imageWrap.append(image);
      if (item.category) imageWrap.append(el("span", "event-post-sample-label", item.category));

      const body = el("div", "event-post-content");
      const meta = el("div", "event-post-meta");
      if (item.date) meta.append(el("span", "", `📅 ${item.date}`));
      if (item.location) meta.append(el("span", "", `📍 ${item.location}`));
      const title = el("h3", "", item.title || "Kegiatan IGJVLab");
      const summary = el("p", "", item.summary || "");
      body.append(meta, title, summary);
      if (item.story) body.append(el("p", "", item.story));
      if (item.author) {
        const byline = el("div", "event-post-byline", "Ditulis oleh ");
        byline.append(el("strong", "", item.author));
        body.append(byline);
      }
      article.append(imageWrap, body);
      target.append(article);
    });
  }

  function renderJobs(items) {
    const target = document.getElementById("cms-job-list");
    if (!target) return;
    target.replaceChildren();
    if (!items.length) { target.append(el("p", "cms-empty-state", "Belum ada konten. Pengelola dapat menambahkan postingan melalui halaman CMS.")); return; }
    items.forEach((item) => {
      const card = el("article", "pro-job-card");
      const content = el("div");
      const badge = el("div", "job-company-badge");
      if (item.image) {
        const image = el("img", "cms-card-photo");
        image.src = safeUrl(item.image);
        image.alt = item.company || "Logo perusahaan";
        badge.append(image);
      } else badge.append(el("div", "company-logo-circle", "🌱"));

      const heading = el("div");
      heading.append(el("h4", "job-role-name", item.title || "Peluang kerja"));
      heading.append(el("div", "job-corp-name", item.company || ""));
      badge.append(heading);
      content.append(badge);

      const tags = el("div", "job-tags-wrap");
      [item.type, item.location, item.category].filter(Boolean).forEach((value) => tags.append(el("span", "job-chip", value)));
      content.append(tags, el("p", "cms-card-description", item.description || ""));
      const button = el(item.applyUrl ? "a" : "button", "btn-job-apply", "Apply Now");
      if (item.applyUrl) {
        button.href = safeUrl(item.applyUrl, "#");
        button.target = "_blank";
        button.rel = "noopener noreferrer";
      } else {
        button.type = "button";
        button.addEventListener("click", () => window.openApplyPrompt?.(item.title || "", item.company || ""));
      }
      card.append(content, button);
      target.append(card);
    });
  }

  function renderProjects(items) {
    const target = document.getElementById("cms-project-list");
    if (!target) return;
    target.replaceChildren();
    if (!items.length) { target.append(el("p", "cms-empty-state", "Belum ada konten. Pengelola dapat menambahkan postingan melalui halaman CMS.")); return; }
    items.forEach((item) => {
      const card = el("article", "pro-project-card");
      const image = el("img", "project-thumb");
      image.src = safeUrl(item.image, "images/journey.jpg");
      image.alt = item.title || "Foto proyek";
      const details = el("div", "project-card-details");
      const tags = el("div", "project-tag-strip");
      (Array.isArray(item.tags) ? item.tags : []).filter(Boolean).forEach((tag) => tags.append(el("span", "tag-bubble", tag)));
      details.append(tags, el("h4", "project-heading", item.title || "Proyek hijau"));
      if (item.location) details.append(el("div", "project-loc-tag", `📍 ${item.location}`));
      details.append(el("p", "cms-card-description", item.description || ""));
      const button = el("button", "btn-project-action", "View Detail");
      button.type = "button";
      button.addEventListener("click", () => window.openProjectDetailsModal?.(item.title || "", item.location || "", item.details || item.description || ""));
      details.append(button);
      card.append(image, details);
      target.append(card);
    });
  }

  function renderNetwork(items) {
    const target = document.getElementById("cms-network-list");
    if (!target) return;
    target.replaceChildren();
    if (!items.length) { target.append(el("p", "cms-empty-state", "Belum ada konten. Pengelola dapat menambahkan postingan melalui halaman CMS.")); return; }
    items.forEach((item) => {
      const card = el("article", "pro-partner-card");
      if (item.image) {
        const image = el("img", "partner-crest cms-partner-image");
        image.src = safeUrl(item.image);
        image.alt = item.name || "Logo mitra";
        card.append(image);
      } else card.append(el("div", "partner-crest", item.shortName || "IGJ"));
      card.append(el("h4", "partner-title-txt", item.name || "Mitra IGJVLab"));
      if (item.country) card.append(el("div", "partner-country-txt", item.country));
      if (item.category) card.append(el("span", "partner-tag-pill", item.category));
      if (item.description) card.append(el("p", "cms-partner-description", item.description));
      target.append(card);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    Promise.allSettled([getItems("events"), getItems("jobs"), getItems("projects"), getItems("network")]).then((results) => {
      if (results[0].status === "fulfilled") renderEvents(results[0].value);
      if (results[1].status === "fulfilled") renderJobs(results[1].value);
      if (results[2].status === "fulfilled") renderProjects(results[2].value);
      if (results[3].status === "fulfilled") renderNetwork(results[3].value);
    });
  });
})();

