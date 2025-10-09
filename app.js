(function () {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function colIdx(L) { let n = 0; for (let i = 0; i < L.length; i++) n = n * 26 + (L.charCodeAt(i) - 64); return n - 1; }
  function cell(data, addr) {
    const m = /^([A-Z]+)(\d+)$/.exec(addr);
    if (!m) return 0;
    const r = parseInt(m[2], 10) - 1;
    const c = colIdx(m[1]);
    return cleanInt((data[r] || [])[c]);
  }
  function cleanInt(v) {
    if (v == null) return 0;
    const s = String(v).replace(/\u00A0/g, "").replace(/[, ]/g, "");
    const num = Number(s);
    return isNaN(num) ? 0 : num;
  }
  function cleanPct(v) {
    if (v == null) return null;
    let s = String(v).replace(/\u00A0/g, "").trim();
    const had = s.includes("%");
    s = s.replace(/[% ]/g, "").replace(/,/g, ".");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    let n = Number(s);
    if (isNaN(n)) return null;
    if (!had && n > 0 && n <= 1) n = n * 100;
    return +n.toFixed(2);
  }
  function nice(n) { n = Number(n) || 0; if (n >= 1e6) return (n / 1e6).toFixed(2) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "k"; return n.toLocaleString(); }

  async function fetchCSV(url) {
    const tries = [
      url,
      "https://r.jina.ai/http/" + url.replace(/^https?:\/\//, ""),
      "https://r.jina.ai/http/https://" + url.replace(/^https?:\/\//, "")
    ];
    for (const u of tries) {
      try {
        const r = await fetch(u, { mode: "cors", cache: "no-store" });
        if (!r.ok) throw 0;
        const t = await r.text();
        if (t && t.length > 10) return t;
      } catch (e) {
        await sleep(120);
      }
    }
    throw new Error("CSV fetch failed");
  }

  /* ---------- Modal ---------- */
  const modal = $("modal"), mtitle = $("mtitle"), mclose = $("mclose");
  let MCH = null;
  function openModal(title) {
    mtitle.textContent = title || "Perincian";
    modal.classList.add("open");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    if (MCH) { MCH.destroy(); MCH = null; }
    modal.classList.remove("open");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
  mclose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  /* =========================================================
     TILE 1 — Akses Perkhidmatan (% akses + populasi)
     ========================================================= */
  const CSV1 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1057141723&single=true&output=csv";
  const DIST1 = [
    { n: "Kota Setar", L: "C" }, { n: "Pendang", L: "D" }, { n: "Kuala Muda", L: "E" },
    { n: "Sik", L: "F" }, { n: "Kulim", L: "G" }, { n: "Bandar Baru", L: "H" },
    { n: "Kubang Pasu", L: "I" }, { n: "Padang Terap", L: "J" }, { n: "Baling", L: "K" },
    { n: "Yan", L: "L" }, { n: "Langkawi", L: "M" }, { n: "Kedah", L: "N" }
  ];
  let RAW1 = null, CH1 = null;

  function padEnds(labels, series) { return { labels: ["", ...labels, ""], series: [0, ...series, 0] }; }
  function drawT1(rows, canvas, mode) {
    const labels = rows.map(r => r.n);
    const akses = rows.map(r => r.a);
    const pop = rows.map(r => r.p);
    const A = padEnds(labels, akses), P = padEnds(labels, pop);
    const X = A.labels;
    if (CH1) CH1.destroy();
    const ctx = $(canvas).getContext("2d");
    const g1 = ctx.createLinearGradient(0, 0, 0, 260); g1.addColorStop(0, "rgba(245,158,11,.45)"); g1.addColorStop(1, "rgba(245,158,11,.03)");
    const g2 = ctx.createLinearGradient(0, 0, 0, 260); g2.addColorStop(0, "rgba(99,102,241,.45)"); g2.addColorStop(1, "rgba(99,102,241,.03)");
    CH1 = new Chart(ctx, {
      type: "line",
      data: {
        labels: X,
        datasets: [
          { label: "% Menerima Perkhidmatan", data: A.series, borderColor: "#f59e0b", backgroundColor: g1, borderWidth: 3, tension: .45, fill: true, yAxisID: "y1", pointRadius: (c) => (c.dataIndex === 0 || c.dataIndex === X.length - 1) ? 0 : 3 },
          { label: "Anggaran Penduduk", data: P.series, borderColor: "#6366f1", backgroundColor: g2, borderWidth: 3, tension: .45, fill: true, yAxisID: "y2", pointRadius: (c) => (c.dataIndex === 0 || c.dataIndex === X.length - 1) ? 0 : 3 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false, filter: (i) => !(i.dataIndex === 0 || i.dataIndex === X.length - 1), callbacks: { label: (c) => c.datasetIndex === 0 ? ` Akses: ${c.parsed.y}%` : ` Populasi: ${nice(c.parsed.y)}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: mode === "main" ? 90 : 40, minRotation: mode === "main" ? 90 : 40, callback: (v, i) => (i === 0 || i === X.length - 1) ? "" : X[i] } },
          y1: { position: "left", beginAtZero: true, ticks: { callback: (v) => v + "%" } },
          y2: { position: "right", beginAtZero: true, grid: { display: false }, ticks: { callback: (v) => nice(v) } }
        }
      }
    });
  }
  async function loadT1() {
    const err = $("t1err"); err.style.display = "none";
    try {
      const csv = await fetchCSV(CSV1);
      RAW1 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      const popRow = RAW1[9] || [], accRow = RAW1[10] || [];
      const rows = DIST1.map(d => {
        const i = colIdx(d.L);
        let a = cleanPct(accRow[i]); if (a === null && String(accRow[i] ?? "").trim() === "0") a = 0;
        const p = cleanInt(popRow[i]);
        return { n: d.n, a, p };
      });
      drawT1(rows, "t1", "main");
      $("t1time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 1)."; err.style.display = "block"; }
  }
  $("t1refresh").addEventListener("click", loadT1);
  $("t1expand").addEventListener("click", () => { if (!RAW1) return; openModal("Akses Kepada Perkhidmatan Kesihatan Pergigian"); const popRow = RAW1[9] || [], accRow = RAW1[10] || []; const rows = DIST1.map(d => { const i = colIdx(d.L); let a = cleanPct(accRow[i]) || 0; const p = cleanInt(popRow[i]); return { n: d.n, a, p }; }); MCH = drawT1(rows, "mcanvas", "modal"); });
  loadT1();

  /* =========================================================
     TILE 2 — Kedatangan Baru & Ulangan (mengikut kategori)
     ========================================================= */
  const CSV2 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1808391684&single=true&output=csv";
  const DIST2 = [
    { n: "Kota Setar", L: "D" }, { n: "Pendang", L: "E" }, { n: "Kuala Muda", L: "F" }, { n: "Sik", L: "G" },
    { n: "Kulim", L: "H" }, { n: "Bandar Baru", L: "I" }, { n: "Kubang Pasu", L: "J" }, { n: "Padang Terap", L: "K" },
    { n: "Baling", L: "L" }, { n: "Yan", L: "M" }, { n: "Langkawi", L: "N" }, { n: "Kedah", L: "O" }
  ];
  const CATS2 = [
    { key: "<5 tahun", b: [8, 10], u: [9, 11] },
    { key: "5-6 tahun", b: [12], u: [13] },
    { key: "7-12 tahun", b: [14, 16], u: [15, 17] },
    { key: "13-17 tahun", b: [18, 20], u: [19, 21] },
    { key: "18-59 tahun", b: [22, 24, 26, 28], u: [23, 25, 27, 29] },
    { key: "<60 tahun", b: [30], u: [31] },
    { key: "Ibu mengandung", b: [34], u: [35] },
    { key: "OKU", b: [36], u: [37] },
    { key: "Bukan warganegara", b: [38], u: [39] }
  ];
  const COLORS2 = {
    "<5 tahun": "#0ea5e9", "5-6 tahun": "#4f46e5", "7-12 tahun": "#10b981",
    "13-17 tahun": "#ef4444", "18-59 tahun": "#8b5cf6", "<60 tahun": "#14b8a6",
    "Ibu mengandung": "#f59e0b", "OKU": "#22c55e", "Bukan warganegara": "#a855f7"
  };
  let RAW2 = null, CH2 = null;

  function buildDD(menuId, btnAll, btnNone, btnClose, items, def) {
    const menu = $(menuId); if (!menu.dataset.built) {
      const foot = menu.querySelector(".mfoot");
      const frag = document.createDocumentFragment();
      items.forEach((txt, i) => {
        const el = document.createElement("label");
        el.className = "row";
        const checked = (def ? txt === def : i === 0) ? "checked" : "";
        el.innerHTML = `<input type="checkbox" data-k="${txt}" ${checked}> ${txt}`;
        frag.appendChild(el);
      });
      menu.insertBefore(frag, foot);
      menu.dataset.built = "1";

      $(btnAll).addEventListener("click", () => menu.querySelectorAll("input").forEach(i => i.checked = true));
      $(btnNone).addEventListener("click", () => menu.querySelectorAll("input").forEach(i => i.checked = false));
      $(btnClose).addEventListener("click", () => menu.classList.remove("open"));
    }
  }
  function chosen(menuId, fb) {
    const s = new Set(); $(menuId).querySelectorAll("input").forEach(i => { if (i.checked) s.add(i.getAttribute("data-k")); });
    if (s.size === 0 && fb) s.add(fb); return s;
  }
  function sumCol(arr, L, rows) { return rows.reduce((t, r) => t + cell(arr, L + String(r)), 0); }
  function computeT2(arr, keys) {
    const labels = ["", ...DIST2.map(d => d.n), ""];
    const per = [];
    CATS2.forEach(c => {
      if (!keys.has(c.key)) return;
      const b = [0], u = [0];
      DIST2.forEach(d => { b.push(sumCol(arr, d.L, c.b)); u.push(sumCol(arr, d.L, c.u)); });
      b.push(0); u.push(0);
      per.push({ key: c.key, b, u });
    });
    return { labels, per };
  }
  function drawT2(data, canvas, mode) {
    if (CH2) CH2.destroy();
    const sets = [];
    data.per.forEach(c => {
      const color = COLORS2[c.key] || "#64748b";
      sets.push({ label: c.key + " • Baru", data: c.b, borderColor: color, backgroundColor: "transparent", borderWidth: 3, tension: .45, fill: false });
      sets.push({ label: c.key + " • Ulangan", data: c.u, borderColor: color, backgroundColor: "transparent", borderWidth: 3, tension: .45, fill: false, borderDash: [6, 4] });
    });
    CH2 = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: sets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false, filter: (i) => !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1) } },
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: mode === "main" ? 90 : 40, minRotation: mode === "main" ? 90 : 40, callback: (v, i) => (i === 0 || i === data.labels.length - 1) ? "" : data.labels[i] } },
          y: { beginAtZero: true, grid: { color: "rgba(15,23,42,.06)" }, ticks: { callback: (v) => Number(v).toLocaleString() } }
        }
      }
    });
  }
  function refreshT2Tags() {
    const set = chosen("dd2menu", "<5 tahun");
    const tags = $("dd2tags"), leg = $("t2legend");
    tags.innerHTML = ""; leg.innerHTML = "";
    Array.from(set).forEach(k => {
      const s = document.createElement("span"); s.className = "tag"; s.textContent = k; tags.appendChild(s);
      const el = document.createElement("span"); el.style.display = "inline-flex"; el.style.alignItems = "center"; el.style.gap = "6px";
      const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = COLORS2[k] || "#64748b";
      const tx = document.createElement("span"); tx.textContent = k; el.appendChild(dot); el.appendChild(tx); leg.appendChild(el);
    });
  }
  async function loadT2() {
    const err = $("t2err"); err.style.display = "none";
    try {
      buildDD("dd2menu", "dd2all", "dd2none", "dd2close", CATS2.map(c => c.key), "<5 tahun");
      const csv = await fetchCSV(CSV2);
      RAW2 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT2Tags();
      const data = computeT2(RAW2, chosen("dd2menu", "<5 tahun"));
      drawT2(data, "t2", "main");
      $("dd2btn").onclick = () => $("dd2menu").classList.toggle("open");
      $("dd2menu").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { refreshT2Tags(); drawT2(computeT2(RAW2, chosen("dd2menu", "<5 tahun")), "t2", "main"); }));
      document.addEventListener("click", (e) => { const box = $("dd2"); if (box && !box.contains(e.target)) $("dd2menu").classList.remove("open"); });
      $("t2time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 2)."; err.style.display = "block"; }
  }
  $("t2refresh").addEventListener("click", loadT2);
  $("t2expand").addEventListener("click", () => { if (!RAW2) return; openModal("Kedatangan Baru & Ulangan"); MCH = drawT2(computeT2(RAW2, chosen("dd2menu", "<5 tahun")), "mcanvas", "modal"); });
  loadT2();

  /* =========================================================
     TILE 3 — Outreach (baru & ulangan mengikut perkhidmatan)
     ========================================================= */
  const CSV3 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1032207232&single=true&output=csv";
  const DIST3 = DIST2.slice();
  const SVCS = [
    { key: "Primer", b: 6, u: 7, color: "#0ea5e9" },
    { key: "Outreach", b: 10, u: 11, color: "#10b981" },
    { key: "UTC", b: 14, u: 15, color: "#f59e0b" },
    { key: "RTC", b: 18, u: 19, color: "#ef4444" },
    { key: "TASTAD", b: 22, u: 23, color: "#8b5cf6" },
    { key: "Sekolah", b: 26, u: 27, color: "#14b8a6" }
  ];
  let RAW3 = null, CH3 = null;

  function buildDD3() { buildDD("dd3menu", "dd3all", "dd3none", "dd3close", SVCS.map(s => s.key), "Primer"); }
  function chosen3() { return chosen("dd3menu", "Primer"); }
  function refreshT3Tags() {
    const set = chosen3(), tags = $("dd3tags"), leg = $("t3legend");
    tags.innerHTML = ""; leg.innerHTML = "";
    Array.from(set).forEach(k => {
      const svc = SVCS.find(s => s.key === k); const color = svc ? svc.color : "#64748b";
      const s = document.createElement("span"); s.className = "tag"; s.textContent = k; tags.appendChild(s);
      const el = document.createElement("span"); el.style.display = "inline-flex"; el.style.alignItems = "center"; el.style.gap = "6px";
      const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = color; const tx = document.createElement("span"); tx.textContent = k;
      el.appendChild(dot); el.appendChild(tx); leg.appendChild(el);
    });
  }
  function computeT3(arr, set) {
    const labels = ["", ...DIST3.map(d => d.n), ""], per = [];
    SVCS.forEach(s => {
      if (!set.has(s.key)) return;
      const b = [0], u = [0];
      DIST3.forEach(d => { b.push(cell(arr, d.L + String(s.b))); u.push(cell(arr, d.L + String(s.u))); });
      b.push(0); u.push(0);
      per.push({ key: s.key, color: s.color, b, u });
    });
    return { labels, per };
  }
  function drawT3(data, canvas, mode) {
    if (CH3) CH3.destroy();
    const sets = [];
    data.per.forEach(s => {
      sets.push({ label: s.key + " • Baru", data: s.b, borderColor: s.color, backgroundColor: "transparent", borderWidth: 3, tension: .45, fill: false });
      sets.push({ label: s.key + " • Ulangan", data: s.u, borderColor: s.color, backgroundColor: "transparent", borderWidth: 3, tension: .45, fill: false, borderDash: [6, 4] });
    });
    CH3 = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: sets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false, filter: (i) => !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1) } },
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: mode === "main" ? 90 : 40, minRotation: mode === "main" ? 90 : 40, callback: (v, i) => (i === 0 || i === data.labels.length - 1) ? "" : data.labels[i] } },
          y: { beginAtZero: true, grid: { color: "rgba(15,23,42,.06)" }, ticks: { callback: (v) => Number(v).toLocaleString() } }
        }
      }
    });
  }
  async function loadT3() {
    const err = $("t3err"); err.style.display = "none";
    try {
      buildDD3();
      const csv = await fetchCSV(CSV3);
      RAW3 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT3Tags();
      drawT3(computeT3(RAW3, chosen3()), "t3", "main");
      $("dd3btn").onclick = () => $("dd3menu").classList.toggle("open");
      $("dd3menu").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { refreshT3Tags(); drawT3(computeT3(RAW3, chosen3()), "t3", "main"); }));
      document.addEventListener("click", (e) => { const box = $("dd3"); if (box && !box.contains(e.target)) $("dd3menu").classList.remove("open"); });
      $("t3time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 3)."; err.style.display = "block"; }
  }
  $("t3refresh").addEventListener("click", loadT3);
  $("t3expand").addEventListener("click", () => { if (!RAW3) return; openModal("Kedatangan Pesakit Outreach"); MCH = drawT3(computeT3(RAW3, chosen3()), "mcanvas", "modal"); });
  loadT3();

  /* =========================================================
     TILE 4 — Toddlers (beberapa metrik pilihan)
     ========================================================= */
  const CSV4 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1851801564&single=true&output=csv";
  const DIST4 = [
    { n: "Kota Setar", L: "D" }, { n: "Pendang", L: "E" }, { n: "Kuala Muda", L: "F" }, { n: "Sik", L: "G" },
    { n: "Kulim", L: "H" }, { n: "Bandar Baru", L: "I" }, { n: "Kubang Pasu", L: "J" }, { n: "Padang Terap", L: "K" },
    { n: "Baling", L: "L" }, { n: "Yan", L: "M" }, { n: "Langkawi", L: "N" }, { n: "Kedah", L: "O" }
  ];
  const MET = [
    { key: "% TASKA dilawati", row: 12, type: "pct", color: "#0ea5e9" },
    { key: "% Liputan Toddler", row: 17, type: "pct", color: "#10b981" },
    { key: "% 'Lift the Lip'", row: 22, type: "pct", color: "#f59e0b" },
    { key: "% Maintaining Orally Fit", row: 28, type: "pct", color: "#8b5cf6" },
    { key: "% Sapuan Fluoride Varnish", row: 32, type: "pct", color: "#ef4444" },
    { key: "Bil. Ibubapa diberi 'AG'", row: 33, type: "cnt", color: "#22c55e" }
  ];
  let RAW4 = null, CH4 = null;

  function buildDD4() { buildDD("dd4menu", "dd4all", "dd4none", "dd4close", MET.map(m => m.key), "% TASKA dilawati"); }
  function chosen4() { return chosen("dd4menu", "% TASKA dilawati"); }
  function refreshT4Tags() {
    const set = chosen4(), tags = $("dd4tags"), leg = $("t4legend"); tags.innerHTML = ""; leg.innerHTML = "";
    Array.from(set).forEach(k => {
      const m = MET.find(x => x.key === k); const color = m ? m.color : "#64748b";
      const s = document.createElement("span"); s.className = "tag"; s.textContent = k; tags.appendChild(s);
      const el = document.createElement("span"); el.style.display = "inline-flex"; el.style.alignItems = "center"; el.style.gap = "6px";
      const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = color; const tx = document.createElement("span"); tx.textContent = k;
      el.appendChild(dot); el.appendChild(tx); leg.appendChild(el);
    });
  }
  function computeT4(arr, set) {
    const labels = ["", ...DIST4.map(d => d.n), ""], per = [];
    MET.forEach(m => {
      if (!set.has(m.key)) return;
      const series = [0]; DIST4.forEach(d => series.push(cell(arr, d.L + String(m.row)))); series.push(0);
      per.push({ key: m.key, type: m.type, color: m.color, data: series });
    });
    return { labels, per };
  }
  function drawT4(data, canvas, mode) {
    if (CH4) CH4.destroy();
    const ds = data.per.map(m => {
      const d = { label: m.key, data: m.data, borderColor: m.color, backgroundColor: "transparent", borderWidth: 3, tension: .45, fill: false };
      d.yAxisID = m.type === "cnt" ? "yR" : "yL"; if (m.key.includes("Lift")) d.borderDash = [6, 4]; return d;
    });
    CH4 = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false, filter: (i) => !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1) } },
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: mode === "main" ? 90 : 40, minRotation: mode === "main" ? 90 : 40, callback: (v, i) => (i === 0 || i === data.labels.length - 1) ? "" : data.labels[i] } },
          yL: { position: "left", beginAtZero: true, ticks: { callback: (v) => v + "%" } },
          yR: { position: "right", beginAtZero: true, grid: { display: false }, ticks: { callback: (v) => nice(v) } }
        }
      }
    });
  }
  async function loadT4() {
    const err = $("t4err"); err.style.display = "none";
    try {
      buildDD4();
      const csv = await fetchCSV(CSV4);
      RAW4 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT4Tags();
      drawT4(computeT4(RAW4, chosen4()), "t4", "main");
      $("dd4btn").onclick = () => $("dd4menu").classList.toggle("open");
      $("dd4menu").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { refreshT4Tags(); drawT4(computeT4(RAW4, chosen4()), "t4", "main"); }));
      document.addEventListener("click", (e) => { const box = $("dd4"); if (box && !box.contains(e.target)) $("dd4menu").classList.remove("open"); });
      $("t4time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 4)."; err.style.display = "block"; }
  }
  $("t4refresh").addEventListener("click", loadT4);
  $("t4expand").addEventListener("click", () => { if (!RAW4) return; openModal("Pencapaian Program Toddler"); MCH = drawT4(computeT4(RAW4, chosen4()), "mcanvas", "modal"); });
  loadT4();

  /* ---------- resize reflow (light) ---------- */
  window.addEventListener("resize", () => {
    if (RAW1) loadT1();
    if (RAW2) loadT2();
    if (RAW3) loadT3();
    if (RAW4) loadT4();
  });
})();
