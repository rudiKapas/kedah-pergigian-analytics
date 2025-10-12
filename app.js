(function () {
  "use strict";

  // ==========
  // Helpers
  // ==========
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // A -> 0, B -> 1, ... Z -> 25, AA -> 26, ...
  function colIdx(L) { let n = 0; for (let i = 0; i < L.length; i++) n = n * 26 + (L.charCodeAt(i) - 64); return n - 1; }

  // Integer-ish cleaner
  function cleanInt(v) {
    if (v == null) return 0;
    const s = String(v).replace(/\u00A0/g, "").replace(/[, ]/g, "");
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }

  // Robust percentage cleaner => 0..100, accepts "54%", "54.2 %", "0.542", "0,542", "54"
  function cleanPct(v) {
    if (v == null) return null;
    let s = String(v).replace(/\u00A0/g, "").trim();
    const hadPct = s.includes("%");
    s = s.replace(/%/g, "").replace(/\s+/g, "").replace(/,/g, ".");
    // remove extra dots (e.g. "54.0.0")
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");

    let n = Number(s);
    if (isNaN(n)) return null;

    // If the text didn't include '%' and the number is 0..1, treat as ratio
    if (!hadPct && n > 0 && n <= 1) n = n * 100;

    // If it looks like 0..1000 but meant as percent without '%', clamp sensibly
    if (!hadPct && n > 1000) return null;

    return +n.toFixed(2);
  }

  function rawCell(data, addr) {
    const m = /^([A-Z]+)(\d+)$/.exec(addr);
    if (!m) return null;
    const r = parseInt(m[2], 10) - 1;
    const c = colIdx(m[1]);
    return (data[r] || [])[c];
  }

  // CSV cell -> integer (supports plain numbers)
  function cellInt(data, addr) {
    return cleanInt(rawCell(data, addr));
  }

  // CSV cell -> integer with plus support ("12+3")
  function cellIntPlus(data, addr) {
    const raw = rawCell(data, addr);
    if (raw == null) return 0;
    const s = String(raw).replace(/\u00A0/g, "").trim();
    return s.split("+").map(x => cleanInt(x)).reduce((a, b) => a + b, 0);
  }

  // CSV cell -> percentage (0..100). Fallback to int if needed.
  function cellPct(data, addr) {
    const raw = rawCell(data, addr);
    let p = cleanPct(raw);
    if (p == null) {
      const asInt = cleanInt(raw);
      p = asInt ? asInt : 0;
    }
    return p;
  }

  function nice(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return n.toLocaleString();
  }

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
      } catch {
        await sleep(120);
      }
    }
    throw new Error("CSV fetch failed");
  }

  // Modal (full-screen expand)
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

  // Menu helpers (multi-select)
  function buildDD(menuId, btnAll, btnNone, btnClose, items, def) {
    const menu = $(menuId); if (menu.dataset.built) return;
    const foot = menu.querySelector(".mfoot"), frag = document.createDocumentFragment();
    items.forEach((txt, i) => {
      const el = document.createElement("label");
      el.className = "row";
      const ck = (def ? txt === def : i === 0) ? "checked" : "";
      el.innerHTML = `<input type="checkbox" data-k="${txt}" ${ck}> ${txt}`;
      frag.appendChild(el);
    });
    menu.insertBefore(frag, foot); menu.dataset.built = "1";
    $(btnAll).addEventListener("click", () => menu.querySelectorAll("input").forEach(i => i.checked = true));
    $(btnNone).addEventListener("click", () => menu.querySelectorAll("input").forEach(i => i.checked = false));
    $(btnClose).addEventListener("click", () => menu.classList.remove("open"));
  }
  function chosen(menuId, fb) {
    const s = new Set();
    $(menuId).querySelectorAll("input").forEach(i => { if (i.checked) s.add(i.getAttribute("data-k")); });
    if (s.size === 0 && fb) s.add(fb);
    return s;
  }

  // =========================
  // TILE 1 — Akses Perkhidmatan
  // =========================
  const CSV1 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1057141723&single=true&output=csv";
  const DIST1 = [
    { n: "Kota Setar", L: "C" }, { n: "Pendang", L: "D" }, { n: "Kuala Muda", L: "E" }, { n: "Sik", L: "F" },
    { n: "Kulim", L: "G" }, { n: "Bandar Baru", L: "H" }, { n: "Kubang Pasu", L: "I" }, { n: "Padang Terap", L: "J" },
    { n: "Baling", L: "K" }, { n: "Yan", L: "L" }, { n: "Langkawi", L: "M" }, { n: "Kedah", L: "N" }
  ];
  let RAW1 = null, CH1 = null;

  function padEnds(labels, series) { return { labels: ["", ...labels, ""], series: [0, ...series, 0] }; }

  function drawT1(rows, canvas, mode) {
    const labels = rows.map(r => r.n), akses = rows.map(r => r.a), pop = rows.map(r => r.p);
    const A = padEnds(labels, akses), P = padEnds(labels, pop), X = A.labels;
    if (CH1) CH1.destroy();
    const ctx = $(canvas).getContext("2d");
    const g1 = ctx.createLinearGradient(0, 0, 0, 260); g1.addColorStop(0, "rgba(245,158,11,.45)"); g1.addColorStop(1, "rgba(245,158,11,.03)");
    const g2 = ctx.createLinearGradient(0, 0, 0, 260); g2.addColorStop(0, "rgba(99,102,241,.45)"); g2.addColorStop(1, "rgba(99,102,241,.03)");

    CH1 = new Chart(ctx, {
      type: "line",
      data: {
        labels: X,
        datasets: [
          { label: "% Menerima Perkhidmatan", data: A.series, borderColor: "#f59e0b", backgroundColor: g1, borderWidth: 3, tension: .45, fill: true, yAxisID: "y1",
            pointRadius: (c) => (c.dataIndex === 0 || c.dataIndex === X.length - 1) ? 0 : 3 },
          { label: "Anggaran Penduduk", data: P.series, borderColor: "#6366f1", backgroundColor: g2, borderWidth: 3, tension: .45, fill: true, yAxisID: "y2",
            pointRadius: (c) => (c.dataIndex === 0 || c.dataIndex === X.length - 1) ? 0 : 3 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: "index", intersect: false, filter: (i) => !(i.dataIndex === 0 || i.dataIndex === X.length - 1),
            callbacks: { label: (c) => c.datasetIndex === 0 ? ` Akses: ${c.parsed.y}%` : ` Populasi: ${nice(c.parsed.y)}` } }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { autoSkip: false, maxRotation: mode === "main" ? 90 : 40, minRotation: mode === "main" ? 90 : 40,
              callback: (v, i) => (i === 0 || i === X.length - 1) ? "" : X[i] }
          },
          y1: { position: "left", beginAtZero: true, ticks: { callback: (v) => v + "%" } },
          y2: { position: "right", beginAtZero: true, grid: { display: false }, ticks: { callback: (v) => nice(v) } }
        }
      }
    });
    return CH1;
  }

  async function loadT1() {
    const err = $("t1err"); err.style.display = "none";
    try {
      const csv = await fetchCSV(CSV1);
      RAW1 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      const popRow = RAW1[9] || [], accRow = RAW1[10] || [];
      const rows = DIST1.map(d => { const i = colIdx(d.L); let a = cleanPct(accRow[i]); if (a == null && String(accRow[i] ?? "").trim() === "0") a = 0; const p = cleanInt(popRow[i]); return { n: d.n, a, p }; });
      drawT1(rows, "t1", "main");
      $("t1time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 1)."; err.style.display = "block"; }
  }
  $("t1refresh").addEventListener("click", loadT1);
  $("t1expand").addEventListener("click", () => {
    if (!RAW1) return; openModal("Akses Kepada Perkhidmatan Kesihatan Pergigian");
    const popRow = RAW1[9] || [], accRow = RAW1[10] || [];
    const rows = DIST1.map(d => { const i = colIdx(d.L); return { n: d.n, a: cleanPct(accRow[i]) || 0, p: cleanInt(popRow[i]) }; });
    MCH = drawT1(rows, "mcanvas", "modal");
  });
  loadT1();

  // =========================
  // TILE 2 — Kedatangan Pesakit Primer (kategori umur)
  // =========================
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
  const COLORS2 = { "<5 tahun": "#0ea5e9", "5-6 tahun": "#4f46e5", "7-12 tahun": "#10b981", "13-17 tahun": "#ef4444", "18-59 tahun": "#8b5cf6", "<60 tahun": "#14b8a6", "Ibu mengandung": "#f59e0b", "OKU": "#22c55e", "Bukan warganegara": "#a855f7" };
  let RAW2 = null, CH2 = null;

  function sumCol(arr, L, rows) { return rows.reduce((t, r) => t + cellInt(arr, L + String(r)), 0); }

  function computeT2(arr, keys) {
    const labels = ["", ...DIST2.map(d => d.n), ""], per = [];
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
    return CH2;
  }

  function refreshT2Tags() {
    const set = chosen("dd2menu", "<5 tahun"), tags = $("dd2tags"), leg = $("t2legend");
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
      const csv = await fetchCSV(CSV2); RAW2 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT2Tags(); drawT2(computeT2(RAW2, chosen("dd2menu", "<5 tahun")), "t2", "main");
      $("dd2btn").onclick = () => $("dd2menu").classList.toggle("open");
      $("dd2menu").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { refreshT2Tags(); drawT2(computeT2(RAW2, chosen("dd2menu", "<5 tahun")), "t2", "main"); }));
      document.addEventListener("click", (e) => { const box = $("dd2"); if (box && !box.contains(e.target)) $("dd2menu").classList.remove("open"); });
      $("t2time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 2)."; err.style.display = "block"; }
  }
  $("t2refresh").addEventListener("click", loadT2);
  $("t2expand").addEventListener("click", () => { if (!RAW2) return; openModal("Kedatangan Pesakit Primer"); MCH = drawT2(computeT2(RAW2, chosen("dd2menu", "<5 tahun")), "mcanvas", "modal"); });
  loadT2();

  // =========================
  // TILE 3 — Outreach (baru/ulangan per kumpulan)
  // =========================
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

  function chosen3() { return chosen("dd3menu", "Primer"); }
  function buildDD3() { buildDD("dd3menu", "dd3all", "dd3none", "dd3close", SVCS.map(s => s.key), "Primer"); }

  function computeT3(arr, set) {
    const labels = ["", ...DIST3.map(d => d.n), ""], per = [];
    SVCS.forEach(s => {
      if (!set.has(s.key)) return;
      const b = [0], u = [0];
      DIST3.forEach(d => { b.push(cellInt(arr, d.L + String(s.b))); u.push(cellInt(arr, d.L + String(s.u))); });
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
    return CH3;
  }

  function refreshT3Tags() {
    const set = chosen3(), tags = $("dd3tags"), leg = $("t3legend"); tags.innerHTML = ""; leg.innerHTML = "";
    Array.from(set).forEach(k => {
      const svc = SVCS.find(s => s.key === k); const c = svc ? svc.color : "#64748b";
      const s = document.createElement("span"); s.className = "tag"; s.textContent = k; tags.appendChild(s);
      const el = document.createElement("span"); el.style.display = "inline-flex"; el.style.alignItems = "center"; el.style.gap = "6px";
      const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = c;
      const tx = document.createElement("span"); tx.textContent = k; el.appendChild(dot); el.appendChild(tx); leg.appendChild(el);
    });
  }

  async function loadT3() {
    const err = $("t3err"); err.style.display = "none";
    try {
      buildDD3(); const csv = await fetchCSV(CSV3); RAW3 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT3Tags(); drawT3(computeT3(RAW3, chosen3()), "t3", "main");
      $("dd3btn").onclick = () => $("dd3menu").classList.toggle("open");
      $("dd3menu").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { refreshT3Tags(); drawT3(computeT3(RAW3, chosen3()), "t3", "main"); }));
      document.addEventListener("click", (e) => { const box = $("dd3"); if (box && !box.contains(e.target)) $("dd3menu").classList.remove("open"); });
      $("t3time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 3)."; err.style.display = "block"; }
  }
  $("t3refresh").addEventListener("click", loadT3);
  $("t3expand").addEventListener("click", () => { if (!RAW3) return; openModal("Kedatangan Pesakit Outreach"); MCH = drawT3(computeT3(RAW3, chosen3()), "mcanvas", "modal"); });
  loadT3();

  // =========================
  // TILE 4 — Pesakit Pakar (Jumlah Baru & Ulangan)
  // =========================
  const CSV4_SPEC = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=666852668&single=true&output=csv";
  // Columns map per specialist group
  const SPEC = {
    "OMF": { color: "#0ea5e9", cols: [
      { n: "Kota Setar", L: "C" }, { n: "Kuala Muda", L: "D" }, { n: "Kulim", L: "E" }, { n: "Kubang Pasu", L: "F" },
      { n: "Langkawi", L: "G" }, { n: "Yan", L: "H" }, { n: "Baling", L: "I" }, { n: "Pendang", L: "J" },
      { n: "Jumlah OMF", L: "K" }, { n: "Reten Negeri", L: "L" }
    ]},
    "Paeds": { color: "#8b5cf6", cols: [
      { n: "Kota Setar", L: "M" }, { n: "Kuala Muda", L: "N" }, { n: "Kulim", L: "O" }, { n: "Langkawi", L: "P" },
      { n: "Baling", L: "Q" }, { n: "Bandar Baru", L: "R" }, { n: "Jumlah Paeds", L: "S" }, { n: "Reten Negeri Paeds", L: "T" }
    ]},
    "Ortho": { color: "#ef4444", cols: [
      { n: "Kota Setar", L: "U" }, { n: "Kuala Muda", L: "V" }, { n: "Kulim", L: "W" }, { n: "Kubang Pasu", L: "X" },
      { n: "Langkawi", L: "Y" }, { n: "Baling", L: "Z" }, { n: "Jumlah Ortho", L: "AA" }, { n: "Reten Negeri Ortho", L: "AB" }
    ]},
    "Perio": { color: "#10b981", cols: [
      { n: "Kota Setar", L: "AC" }, { n: "Kuala Muda", L: "AD" }, { n: "Baling", L: "AE" },
      { n: "Langkawi", L: "AG" }, { n: "Padang Terap", L: "AH" }, { n: "Sik", L: "AI" }, { n: "Kulim", L: "AJ" },
      { n: "Jumlah Perio", L: "AK" }, { n: "Reten Negeri Perio", L: "AL" }
    ]},
    "Resto": { color: "#f59e0b", cols: [
      { n: "Kota Setar", L: "AM" }, { n: "Kuala Muda", L: "AN" }, { n: "Kulim", L: "AO" }, { n: "Baling", L: "AP" },
      { n: "Kubang Pasu", L: "AQ" }, { n: "Langkawi", L: "AR" }, { n: "Jumlah Resto", L: "AS" }, { n: "Reten Negeri Resto", L: "AT" }
    ]},
    "OMOP": { color: "#14b8a6", cols: [
      { n: "Kota Setar", L: "AV" }, { n: "Kuala Muda", L: "AU" }, { n: "Jumlah OMOP", L: "AW" }, { n: "Reten Negeri OMOP", L: "AX" }
    ]},
    "DPH": { color: "#a855f7", cols: [
      { n: "Kota Setar", L: "AY" }, { n: "Kota Setar Reten Negeri", L: "AZ" }
    ]}
  };
  let RAW4S = null, CH4S = null;

  function buildDD4S() { buildDD("dd4menu", "dd4all", "dd4none", "dd4close", Object.keys(SPEC), "OMF"); }
  function chosen4S() {
    // single-choice: pick first checked, or default "OMF"
    const menu = $("dd4menu");
    let pick = null;
    menu.querySelectorAll("input").forEach(i => { if (i.checked && !pick) pick = i.getAttribute("data-k"); });
    return pick || "OMF";
  }
  function refreshT4STags() {
    const k = chosen4S(), tags = $("dd4tags"), leg = $("t4legend"); tags.innerHTML = ""; leg.innerHTML = "";
    const s = document.createElement("span"); s.className = "tag"; s.textContent = k; tags.appendChild(s);
    const el = document.createElement("span"); el.style.display = "inline-flex"; el.style.alignItems = "center"; el.style.gap = "6px";
    const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = SPEC[k]?.color || "#64748b";
    const tx = document.createElement("span"); tx.textContent = "Baru • Ulangan"; el.appendChild(dot); el.appendChild(tx); leg.appendChild(el);
  }

  function computeT4S(arr, key) {
    const grp = SPEC[key]; if (!grp) return { labels: [], b: [], u: [], color: "#64748b" };
    const labels = ["", ...grp.cols.map(x => x.n), ""], b = [0], u = [0];
    grp.cols.forEach(d => {
      b.push(cellIntPlus(arr, d.L + "28"));
      u.push(cellIntPlus(arr, d.L + "29"));
    });
    b.push(0); u.push(0);
    return { labels, b, u, color: grp.color };
  }

  function drawT4S(data, canvas, mode) {
    if (CH4S) CH4S.destroy();
    CH4S = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          { label: "Baru", data: data.b, borderColor: data.color, backgroundColor: "transparent", borderWidth: 3, tension: .45, fill: false },
          { label: "Ulangan", data: data.u, borderColor: data.color, backgroundColor: "transparent", borderWidth: 3, tension: .45, fill: false, borderDash: [6,4] }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false, filter: (i) => !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1) } },
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: mode === "main" ? 90 : 40, minRotation: mode === "main" ? 90 : 40, callback: (v, i) => (i === 0 || i === data.labels.length - 1) ? "" : data.labels[i] } },
          y: { beginAtZero: true, grid: { color: "rgba(15,23,42,.06)" }, ticks: { callback: (v) => Number(v).toLocaleString() } }
        }
      }
    });
    return CH4S;
  }

  async function loadT4S() {
    const err = $("t4err"); err.style.display = "none";
    try {
      buildDD4S();
      const csv = await fetchCSV(CSV4_SPEC); RAW4S = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT4STags();
      drawT4S(computeT4S(RAW4S, chosen4S()), "t4", "main");
      $("dd4btn").onclick = () => $("dd4menu").classList.toggle("open");
      $("dd4menu").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { refreshT4STags(); drawT4S(computeT4S(RAW4S, chosen4S()), "t4", "main"); }));
      document.addEventListener("click", (e) => { const box = $("dd4"); if (box && !box.contains(e.target)) $("dd4menu").classList.remove("open"); });
      $("t4time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 4)."; err.style.display = "block"; }
  }
  $("t4refresh").addEventListener("click", loadT4S);
  $("t4expand").addEventListener("click", () => { if (!RAW4S) return; openModal("Jumlah Kedatangan Pesakit Pakar"); MCH = drawT4S(computeT4S(RAW4S, chosen4S()), "mcanvas", "modal"); });
  loadT4S();

  // =========================
  // TILE 5 — Toddler (with sasaran straight lines)
  // =========================
  const CSV_TOD = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1851801564&single=true&output=csv";
  const DIST_TOD = [
    { n: "Kota Setar", L: "D" }, { n: "Pendang", L: "E" }, { n: "Kuala Muda", L: "F" }, { n: "Sik", L: "G" },
    { n: "Kulim", L: "H" }, { n: "Bandar Baru", L: "I" }, { n: "Kubang Pasu", L: "J" }, { n: "Padang Terap", L: "K" },
    { n: "Baling", L: "L" }, { n: "Yan", L: "M" }, { n: "Langkawi", L: "N" }, { n: "Kedah", L: "O" }
  ];
  const MET_TOD = [
    { key: "% TASKA dilawati", row: 12, type: "pct", color: "#0ea5e9" },
    { key: "% Liputan Toddler", row: 17, type: "pct", color: "#10b981", target: 25 },
    { key: "% 'Lift the Lip'", row: 22, type: "pct", color: "#f59e0b", target: 50 },
    { key: "% Maintaining Orally Fit", row: 28, type: "pct", color: "#8b5cf6", target: 75 },
    { key: "% Sapuan Fluoride Varnish", row: 32, type: "pct", color: "#ef4444", target: 70 },
    { key: "Bil. Ibubapa diberi 'AG'", row: 33, type: "cnt", color: "#22c55e" }
  ];
  let RAW_TOD = null, CH_TOD = null;

  function buildDD5() { buildDD("dd5menu", "dd5all", "dd5none", "dd5close", MET_TOD.map(m => m.key), "% TASKA dilawati"); }
  function chosen5() { return chosen("dd5menu", "% TASKA dilawati"); }

  function computeT5(arr, set) {
    const labels = ["", ...DIST_TOD.map(d => d.n), ""], per = [];
    MET_TOD.forEach(m => {
      if (!set.has(m.key)) return;
      const s = [0]; DIST_TOD.forEach(d => s.push(m.type === "pct" ? cellPct(arr, d.L + String(m.row)) : cellInt(arr, d.L + String(m.row)))); s.push(0);
      per.push({ key: m.key, type: m.type, color: m.color, target: m.target, data: s });
    });
    return { labels, per };
  }

  function straightLine(len, value) { return new Array(len).fill(value); }

  function drawT5(data, canvas, mode) {
    if (CH_TOD) CH_TOD.destroy();
    const ds = [];
    data.per.forEach(m => {
      ds.push({
        label: m.key, data: m.data, borderColor: m.color, backgroundColor: "transparent",
        borderWidth: 3, tension: .45, fill: false, yAxisID: m.type === "cnt" ? "yR" : "yL",
        borderDash: m.key.includes("Lift") ? [6, 4] : undefined
      });
      if (m.target != null && m.type !== "cnt") {
        const flat = straightLine(m.data.length, m.target);
        ds.push({
          label: `Sasaran ${m.key.split("%").pop().trim()}`,
          data: flat, borderColor: "#475569", borderWidth: 2, borderDash: [4, 4], pointRadius: 0, fill: false, yAxisID: "yL"
        });
      }
    });

    CH_TOD = new Chart($(canvas).getContext("2d"), {
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
    return CH_TOD;
  }

  async function loadT5() {
    const err = $("t5err"); err.style.display = "none";
    try {
      buildDD5();
      const csv = await fetchCSV(CSV_TOD); RAW_TOD = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      $("dd5btn").onclick = () => $("dd5menu").classList.toggle("open");
      $("dd5menu").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { refreshT5Tags(); drawT5(computeT5(RAW_TOD, chosen5()), "t5", "main"); }));
      document.addEventListener("click", (e) => { const box = $("dd5"); if (box && !box.contains(e.target)) $("dd5menu").classList.remove("open"); });

      refreshT5Tags(); drawT5(computeT5(RAW_TOD, chosen5()), "t5", "main");
      $("t5time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 5)."; err.style.display = "block"; }
  }
  function refreshT5Tags() {
    const set = chosen5(), tags = $("dd5tags"), leg = $("t5legend"); tags.innerHTML = ""; leg.innerHTML = "";
    Array.from(set).forEach(k => {
      const m = MET_TOD.find(x => x.key === k); const c = m ? m.color : "#64748b";
      const s = document.createElement("span"); s.className = "tag"; s.textContent = k; tags.appendChild(s);
      const el = document.createElement("span"); el.style.display = "inline-flex"; el.style.alignItems = "center"; el.style.gap = "6px";
      const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = c;
      const tx = document.createElement("span"); tx.textContent = k; el.appendChild(dot); el.appendChild(tx); leg.appendChild(el);
    });
  }
  $("t5refresh").addEventListener("click", loadT5);
  $("t5expand").addEventListener("click", () => { if (!RAW_TOD) return; openModal("Pencapaian Program Toddler"); MCH = drawT5(computeT5(RAW_TOD, chosen5()), "mcanvas", "modal"); });
  loadT5();

  // =========================
  // TILE 6 — Liputan Ibu Mengandung (robust % + sasaran straight)
  // =========================
  const CSV_PREG = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=205423549&single=true&output=csv";
  const DIST_PREG = [
    { n: "Kota Setar", L: "D" }, { n: "Pendang", L: "E" }, { n: "Kuala Muda", L: "F" }, { n: "Sik", L: "G" },
    { n: "Kulim", L: "H" }, { n: "Bandar Baru", L: "I" }, { n: "Kubang Pasu", L: "J" }, { n: "Padang Terap", L: "K" },
    { n: "Baling", L: "L" }, { n: "Yan", L: "M" }, { n: "Langkawi", L: "N" }, { n: "Kedah", L: "O" }, { n: "G-RET NEGERI", L: "P" }
  ];
  const MET_PREG = [
    { key: "% Liputan Ibu Mengandung", row: 8, color: "#0ea5e9", target: 70 },
    { key: "% Liputan Ibu Mengandung diberi PKP", row: 14, color: "#8b5cf6", target: 90 },
    { key: "% Ibu Mengandung mencapai status Orally Fit", row: 19, color: "#10b981", target: 25 }
  ];
  let RAW_PREG = null, CH_PREG = null;

  function buildDD6() { buildDD("dd6menu", "dd6all", "dd6none", "dd6close", MET_PREG.map(m => m.key), MET_PREG[0].key); }
  function chosen6() { return chosen("dd6menu", MET_PREG[0].key); }

  function computeT6(arr, set) {
    const labels = ["", ...DIST_PREG.map(d => d.n), ""], per = [];
    MET_PREG.forEach(m => {
      if (!set.has(m.key)) return;
      const s = [0];
      DIST_PREG.forEach(d => s.push(cellPct(arr, d.L + String(m.row))));
      s.push(0);
      per.push({ key: m.key, color: m.color, target: m.target, data: s });
    });
    return { labels, per };
  }

  function drawT6(data, canvas, mode) {
    if (CH_PREG) CH_PREG.destroy();
    const ds = [];
    data.per.forEach(m => {
      ds.push({ label: m.key, data: m.data, borderColor: m.color, backgroundColor: "transparent", borderWidth: 3, tension: .45, fill: false, yAxisID: "y" });
      if (m.target != null) {
        const flat = new Array(m.data.length).fill(m.target);
        ds.push({ label: `Sasaran ${m.key}`, data: flat, borderColor: "#475569", borderWidth: 2, borderDash: [4, 4], pointRadius: 0, fill: false, yAxisID: "y" });
      }
    });
    CH_PREG = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false, filter: (i) => !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1) } },
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: mode === "main" ? 90 : 40, minRotation: mode === "main" ? 90 : 40, callback: (v, i) => (i === 0 || i === data.labels.length - 1) ? "" : data.labels[i] } },
          y: { beginAtZero: true, ticks: { callback: (v) => v + "%" } }
        }
      }
    });
    return CH_PREG;
  }

  async function loadT6() {
    const err = $("t6err"); err.style.display = "none";
    try {
      buildDD6(); const csv = await fetchCSV(CSV_PREG); RAW_PREG = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT6Tags(); drawT6(computeT6(RAW_PREG, chosen6()), "t6", "main");
      $("dd6btn").onclick = () => $("dd6menu").classList.toggle("open");
      $("dd6menu").querySelectorAll("input").forEach(i => i.addEventListener("change", () => { refreshT6Tags(); drawT6(computeT6(RAW_PREG, chosen6()), "t6", "main"); }));
      document.addEventListener("click", (e) => { const box = $("dd6"); if (box && !box.contains(e.target)) $("dd6menu").classList.remove("open"); });
      $("t6time").textContent = new Date().toLocaleString();
    } catch (e) { console.error(e); err.textContent = "Gagal memuatkan CSV (Tile 6)."; err.style.display = "block"; }
  }

  function refreshT6Tags() {
    const set = chosen6(), tags = $("dd6tags"), leg = $("t6legend"); tags.innerHTML = ""; leg.innerHTML = "";
    Array.from(set).forEach(k => {
      const m = MET_PREG.find(x => x.key === k); const c = m ? m.color : "#64748b";
      const s = document.createElement("span"); s.className = "tag"; s.textContent = k; tags.appendChild(s);
      const el = document.createElement("span"); el.style.display = "inline-flex"; el.style.alignItems = "center"; el.style.gap = "6px";
      const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = c;
      const tx = document.createElement("span"); tx.textContent = k; el.appendChild(dot); el.appendChild(tx); leg.appendChild(el);
    });
  }
  $("t6refresh").addEventListener("click", loadT6);
  $("t6expand").addEventListener("click", () => { if (!RAW_PREG) return; openModal("Liputan Ibu Mengandung"); MCH = drawT6(computeT6(RAW_PREG, chosen6()), "mcanvas", "modal"); });
  loadT6();

  // Reflow on resize (keeps look crisp)
  window.addEventListener("resize", () => {
    if (RAW1) {
      const popRow = RAW1[9] || [], accRow = RAW1[10] || [];
      const rows = DIST1.map(d => { const i = colIdx(d.L); return { n: d.n, a: cleanPct(accRow[i]) || 0, p: cleanInt(popRow[i]) }; });
      drawT1(rows, "t1", "main");
    }
    if (RAW2) drawT2(computeT2(RAW2, chosen("dd2menu", "<5 tahun")), "t2", "main");
    if (RAW3) drawT3(computeT3(RAW3, chosen("dd3menu", "Primer")), "t3", "main");
    if (RAW4S) drawT4S(computeT4S(RAW4S, chosen4S()), "t4", "main");
    if (RAW_TOD) drawT5(computeT5(RAW_TOD, chosen5()), "t5", "main");
    if (RAW_PREG) drawT6(computeT6(RAW_PREG, chosen6()), "t6", "main");
  });
})();
