(() => {
  const identity = window.netlifyIdentity;
  const api = "/.netlify/functions";
  const sections = {
    events: { title: "Dokumentasi kegiatan", eyebrow: "HALAMAN DEPAN", fields: [
      ["title", "Judul kegiatan", "text", true], ["date", "Tanggal", "date"], ["location", "Lokasi", "text"],
      ["category", "Jenis kegiatan", "text"], ["summary", "Ringkasan", "textarea", true], ["story", "Cerita lengkap", "textarea"],
      ["author", "Nama penulis", "text"], ["image", "Foto utama", "image"]
    ] },
    jobs: { title: "Peluang Green Jobs", eyebrow: "GREEN JOBS", fields: [
      ["title", "Nama posisi", "text", true], ["company", "Perusahaan/organisasi", "text", true],
      ["type", "Jenis pekerjaan", "text"], ["location", "Lokasi kerja", "text"], ["category", "Bidang", "text"],
      ["description", "Deskripsi", "textarea", true], ["applyUrl", "Link lamaran", "url"], ["image", "Foto atau logo", "image"]
    ] },
    projects: { title: "Proyek", eyebrow: "PROJECTS", fields: [
      ["title", "Nama proyek", "text", true], ["location", "Lokasi", "text"], ["tags", "Kategori", "text"],
      ["description", "Ringkasan", "textarea", true], ["details", "Detail dan dampak", "textarea"], ["image", "Foto proyek", "image"]
    ] },
    network: { title: "Anggota Network", eyebrow: "NETWORK", fields: [
      ["name", "Nama organisasi", "text", true], ["shortName", "Nama singkat", "text"], ["country", "Negara/lokasi", "text"],
      ["category", "Jenis kemitraan", "text"], ["description", "Deskripsi", "textarea"], ["image", "Logo atau foto", "image"]
    ] }
  };

  const loginNotice = document.getElementById("login-notice");
  const cmsApp = document.getElementById("cms-app");
  const userLabel = document.getElementById("user-label");
  const loginButton = document.getElementById("login-button");
  const loginButtonMain = document.getElementById("login-button-main");
  const logoutButton = document.getElementById("logout-button");
  const entryList = document.getElementById("entry-list");
  const form = document.getElementById("entry-form");
  const fieldsContainer = document.getElementById("form-fields");
  const statusBox = document.getElementById("status-message");
  let currentUser = null;
  let currentSection = "events";
  let entries = [];
  let editingId = null;
  let formImageUrl = "";

  function showStatus(message, isError = false) {
    statusBox.textContent = message;
    statusBox.classList.toggle("error", isError);
    statusBox.hidden = false;
  }

  function hideStatus() { statusBox.hidden = true; }

  async function token() {
    if (!currentUser) throw new Error("Sesi login sudah berakhir. Login kembali untuk menyimpan.");
    return currentUser.jwt();
  }

  async function authenticatedFetch(url, options = {}) {
    const jwt = await token();
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${jwt}`);
    return fetch(url, { ...options, headers });
  }

  function setLoggedIn(user) {
    currentUser = user || null;
    const loggedIn = Boolean(currentUser);
    loginNotice.hidden = loggedIn;
    cmsApp.hidden = !loggedIn;
    loginButton.hidden = loggedIn;
    logoutButton.hidden = !loggedIn;
    userLabel.textContent = loggedIn ? currentUser.email : "Belum login";
    if (loggedIn) loadSection(currentSection);
  }

  function openLogin() {
    if (identity) identity.open("login");
    else showStatus("Layanan login belum tersedia. Coba buka kembali halaman ini.", true);
  }

  loginButton.addEventListener("click", openLogin);
  loginButtonMain.addEventListener("click", openLogin);
  logoutButton.addEventListener("click", () => identity?.logout());
  document.getElementById("new-entry-button").addEventListener("click", () => openForm());
  document.getElementById("cancel-form-button").addEventListener("click", closeForm);
  document.getElementById("cancel-form-button-bottom").addEventListener("click", closeForm);

  document.querySelectorAll(".section-button").forEach((button) => {
    button.addEventListener("click", () => {
      currentSection = button.dataset.section;
      document.querySelectorAll(".section-button").forEach((item) => item.classList.toggle("active", item === button));
      closeForm();
      loadSection(currentSection);
    });
  });

  if (identity) {
    identity.on("init", (user) => setLoggedIn(user));
    identity.on("login", (user) => { setLoggedIn(user); identity.close(); });
    identity.on("logout", () => setLoggedIn(null));
  } else {
    showStatus("Login pengelola hanya tersedia setelah Identity diaktifkan di Netlify.", true);
  }

  async function loadSection(section) {
    hideStatus();
    document.getElementById("section-title").textContent = sections[section].title;
    document.getElementById("section-eyebrow").textContent = sections[section].eyebrow;
    entryList.innerHTML = '<div class="empty-state">Memuat konten…</div>';
    try {
      const response = await fetch(`${api}/content?section=${encodeURIComponent(section)}`);
      if (!response.ok) throw new Error("Konten belum bisa dimuat. Coba refresh halaman.");
      const data = await response.json();
      entries = Array.isArray(data) ? data : [];
      renderList();
    } catch (error) {
      entryList.innerHTML = '<div class="empty-state">Konten belum bisa dimuat.</div>';
      showStatus(error.message || "Gagal memuat konten.", true);
    }
  }

  function renderList() {
    entryList.replaceChildren();
    if (!entries.length) {
      entryList.append(Object.assign(document.createElement("div"), { className: "empty-state", textContent: "Belum ada konten di bagian ini. Klik “Tambah konten” untuk mulai." }));
      return;
    }
    entries.forEach((entry) => {
      const row = document.createElement("article");
      row.className = "entry-row";
      if (entry.image) {
        const image = document.createElement("img");
        image.src = entry.image;
        image.alt = "";
        image.onerror = () => image.remove();
        row.append(image);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "entry-placeholder";
        placeholder.textContent = currentSection === "events" ? "📷" : "🌱";
        row.append(placeholder);
      }
      const info = document.createElement("div");
      info.className = "entry-info";
      const title = document.createElement("strong");
      title.textContent = entry.title || entry.name || entry.company || "Konten tanpa judul";
      const meta = document.createElement("span");
      meta.textContent = entry.date || entry.company || entry.category || "Konten tersimpan";
      info.append(title, meta);
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const edit = document.createElement("button");
      edit.className = "small-button";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => openForm(entry));
      const remove = document.createElement("button");
      remove.className = "small-button danger";
      remove.type = "button";
      remove.textContent = "Hapus";
      remove.addEventListener("click", () => deleteEntry(entry.id));
      actions.append(edit, remove);
      row.append(info, actions);
      entryList.append(row);
    });
  }

  function makeField(spec, value) {
    const [name, label, type, required] = spec;
    const wrap = document.createElement("div");
    wrap.className = ["field", type === "textarea" || type === "image" ? "full" : ""].filter(Boolean).join(" ");
    const labelNode = document.createElement("label");
    labelNode.htmlFor = `field-${name}`;
    labelNode.textContent = label;
    wrap.append(labelNode);

    if (type === "image") {
      const tools = document.createElement("div");
      tools.className = "image-tools";
      const input = document.createElement("input");
      input.type = "url";
      input.id = `field-${name}`;
      input.name = name;
      input.placeholder = "URL foto, atau pilih file di bawah";
      input.value = value || "";
      input.addEventListener("input", () => { formImageUrl = input.value.trim(); updatePreview(); });
      const picker = document.createElement("input");
      picker.type = "file";
      picker.accept = "image/jpeg,image/png,image/webp";
      picker.setAttribute("aria-label", "Pilih gambar dari perangkat");
      picker.addEventListener("change", () => uploadImage(picker.files?.[0], input, preview));
      tools.append(input, picker);
      wrap.append(tools);
      const preview = document.createElement("img");
      preview.className = "image-preview";
      preview.alt = "Preview gambar";
      preview.hidden = !value;
      preview.src = value || "";
      formImageUrl = value || "";
      wrap.append(preview);
      const help = document.createElement("span");
      help.className = "field-help";
      help.textContent = "Bisa unggah foto langsung. Gambar akan disimpan di Netlify.";
      wrap.append(help);
      function updatePreview() { preview.src = formImageUrl; preview.hidden = !formImageUrl; }
      return wrap;
    }

    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    input.id = `field-${name}`;
    input.name = name;
    if (type !== "textarea") input.type = type;
    input.value = Array.isArray(value) ? value.join(", ") : value || "";
    input.required = Boolean(required);
    if (type === "textarea") input.rows = 4;
    wrap.append(input);
    if (name === "tags") {
      const help = document.createElement("span");
      help.className = "field-help";
      help.textContent = "Pisahkan beberapa kategori dengan koma.";
      wrap.append(help);
    }
    return wrap;
  }

  function openForm(entry = null) {
    editingId = entry?.id || null;
    formImageUrl = entry?.image || "";
    document.getElementById("form-title").textContent = entry ? "Edit konten" : "Konten baru";
    fieldsContainer.replaceChildren(...sections[currentSection].fields.map((spec) => makeField(spec, entry?.[spec[0]])));
    form.hidden = false;
    document.getElementById("new-entry-button").hidden = true;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeForm() {
    form.hidden = true;
    document.getElementById("new-entry-button").hidden = false;
    form.reset();
    editingId = null;
    formImageUrl = "";
  }

  async function compressImage(file) {
    if (!file) throw new Error("Pilih foto terlebih dahulu.");
    if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
    if (file.size <= 1200 * 1024) return file;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob) throw new Error("Foto tidak bisa diproses. Coba format JPG atau PNG.");
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  }

  async function uploadImage(file, urlInput, preview) {
    if (!file) return;
    showStatus("Mengunggah gambar…");
    try {
      const processed = await compressImage(file);
      if (processed.size > 4 * 1024 * 1024) throw new Error("Ukuran foto masih terlalu besar. Pilih foto yang lebih kecil.");
      const body = new FormData();
      body.append("image", processed, processed.name);
      const response = await authenticatedFetch(`${api}/media`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal mengunggah gambar.");
      formImageUrl = result.url;
      urlInput.value = result.url;
      preview.src = result.url;
      preview.hidden = false;
      showStatus("Gambar berhasil diunggah. Simpan konten untuk menerapkan perubahan.");
    } catch (error) { showStatus(error.message || "Gagal mengunggah gambar.", true); }
  }

  function collectEntry() {
    const data = {};
    sections[currentSection].fields.forEach(([name]) => {
      const input = form.elements.namedItem(name);
      if (!input) return;
      let value = name === "image" ? formImageUrl || input.value.trim() : input.value.trim();
      if (name === "tags") value = value.split(",").map((tag) => tag.trim()).filter(Boolean);
      data[name] = value;
    });
    if (!data.id) data.id = editingId || `${currentSection}-${crypto.randomUUID()}`;
    return data;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideStatus();
    const entry = collectEntry();
    if (!entry.title && !entry.name && !entry.company) return showStatus("Isi judul atau nama konten terlebih dahulu.", true);
    const next = entries.slice();
    const index = next.findIndex((item) => item.id === editingId);
    if (index >= 0) next[index] = entry;
    else next.unshift(entry);
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Menyimpan…";
    try {
      const response = await authenticatedFetch(`${api}/content?section=${encodeURIComponent(currentSection)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan konten.");
      entries = next;
      closeForm();
      renderList();
      showStatus("Konten tersimpan dan sudah tampil di website.");
    } catch (error) { showStatus(error.message || "Gagal menyimpan konten.", true); }
    finally { submit.disabled = false; submit.textContent = "Simpan konten"; }
  });

  async function deleteEntry(id) {
    if (!window.confirm("Hapus konten ini dari website?")) return;
    const next = entries.filter((item) => item.id !== id);
    try {
      const response = await authenticatedFetch(`${api}/content?section=${encodeURIComponent(currentSection)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal menghapus konten.");
      entries = next;
      renderList();
      showStatus("Konten sudah dihapus dari website.");
    } catch (error) { showStatus(error.message || "Gagal menghapus konten.", true); }
  }
})();

