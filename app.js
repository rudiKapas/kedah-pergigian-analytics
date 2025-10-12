/* global Papa, Chart */
(function () {
  "use strict";

  // ============== Helpers =================
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function colIdx(L) {
    let n = 0;
    for (let i = 0; i < L.length; i++) n = n * 26 + (L.charCodeAt(i) - 64);
    return n - 1;
  }
  function nice(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return n.toLocaleString();
  }

  function cleanInt(v) {
    if (v == null) return 0;
    const s = String(v).replace(/\u00A0/g, "").replace(/[, ]/g, "");
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }
  function cleanPct(v) {
    if (v == null) return null;
    let s = String(v).replace(/\u00A0/g, "").trim();
    const hadPct = s.includes("%");
    s = s.replace(/%/g, "").replace(/\s+/g, "").replace(/,/g, ".");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    let n = Number(s);
    if (isNaN(n)) return null;
    if (!hadPct && n > 0 && n <= 1) n *= 100;
    if (!hadPct && n > 1000) return null;
    return +n.toFixed(2);
  }

  function rawCell(data, addr) {
    const m = /^([A-Z]+)(\d+)$/.exec(addr);
    if (!m) return null;
    const r = parseInt(m[2], 10) - 1;
    const c = colIdx(m[1]);
    return data[r] && data[r][c] != null ? data[r][c] : null;
  }
  const cellInt = (d, a) => cleanInt(rawCell(d, a));
  function cellIntPlus(d, a) {
    const raw = rawCell(d, a);
    if (raw == null) return 0;
    const s = String(raw).replace(/\u00A0/g, "").trim();
    return s
      .split("+")
      .map((x) => cleanInt(x))
      .reduce((A, B) => A + B, 0);
  }
  function cellPct(d, a) {
    const raw = rawCell(d, a);
    let p = cleanPct(raw);
    if (p == null) {
      const asInt = cleanInt(raw);
      p = asInt ? asInt : 0;
    }
    return p;
  }
  function allZero(arr) {
    if (!Array.isArray(arr)) return false;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if ((v == null ? 0 : v) !== 0) return false;
    }
    return true;
  }

  async function fetchCSV(url) {
    const tries = [
      url,
      "https://r.jina.ai/http/" + url.replace(/^https?:\/\//, ""),
      "https://r.jina.ai/http/https://" + url.replace(/^https?:\/\//, ""),
    ];
    for (let i = 0; i < tries.length; i++) {
      const u = tries[i];
      try {
        const r = await fetch(u, { mode: "cors", cache: "no-store" });
        if (!r.ok) throw new Error("bad");
        const t = await r.text();
        if (t && t.length > 10) return t;
      } catch (_e) {
        await sleep(120);
      }
    }
    throw new Error("CSV fetch failed");
  }

  // ============== Modal ====================
  const modal = $("modal");
  const mtitle = $("mtitle");
  const mclose = $("mclose");
  let MCH = null;

  function openModal(title) {
    mtitle.textContent = title || "Perincian";
    modal.classList.add("open");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    if (MCH) {
      MCH.destroy();
      MCH = null;
    }
    modal.classList.remove("open");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
  mclose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // ============== Dropdown =================
  function buildDD(menuId, btnAll, btnNone, btnClose, items, def) {
    const menu = $(menuId);
    if (!menu || menu.dataset.built) return;
    const body = menu.querySelector(".menu-body");
    const frag = document.createDocumentFragment();
    items.forEach((txt, i) => {
      const el = document.createElement("label");
      el.className = "row";
      const checked = (def ? txt === def : i === 0) ? "checked" : "";
      el.innerHTML =
        '<input type="checkbox" data-k="' + txt + '" ' + checked + "> " + txt;
      frag.appendChild(el);
    });
    body.appendChild(frag);
    menu.dataset.built = "1";
    $(btnAll).addEventListener("click", () =>
      menu.querySelectorAll("input").forEach((i) => (i.checked = true))
    );
    $(btnNone).addEventListener("click", () =>
      menu.querySelectorAll("input").forEach((i) => (i.checked = false))
    );
    $(btnClose).addEventListener("click", () => menu.classList.remove("open"));
  }
  function chosen(menuId, fb) {
    const s = new Set();
    $(menuId)
      .querySelectorAll("input")
      .forEach((i) => {
        if (i.checked) s.add(i.getAttribute("data-k"));
      });
    if (s.size === 0 && fb) s.add(fb);
    return s;
  }

  // ============== Tile 1 ===================
  const CSV1 =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1057141723&single=true&output=csv";
  const DIST1 = [
    { n: "Kota Setar", L: "C" },
    { n: "Pendang", L: "D" },
    { n: "Kuala Muda", L: "E" },
    { n: "Sik", L: "F" },
    { n: "Kulim", L: "G" },
    { n: "Bandar Baru", L: "H" },
    { n: "Kubang Pasu", L: "I" },
    { n: "Padang Terap", L: "J" },
    { n: "Baling", L: "K" },
    { n: "Yan", L: "L" },
    { n: "Langkawi", L: "M" },
    { n: "Kedah", L: "N" },
  ];
  let RAW1 = null;
  let CH1 = null;
  const padEnds = (labels, series) => ({
    labels: ["", ...labels, ""],
    series: [0, ...series, 0],
  });

  function drawT1(rows, canvas, mode) {
    const labels = rows.map((r) => r.n);
    const akses = rows.map((r) => r.a);
    const pop = rows.map((r) => r.p);
    const A = padEnds(labels, akses);
    const P = padEnds(labels, pop);
    const X = A.labels;

    if (CH1) CH1.destroy();
    const ctx = $(canvas).getContext("2d");
    const g1 = ctx.createLinearGradient(0, 0, 0, 260);
    g1.addColorStop(0, "rgba(245,158,11,.45)");
    g1.addColorStop(1, "rgba(245,158,11,.03)");
    const g2 = ctx.createLinearGradient(0, 0, 0, 260);
    g2.addColorStop(0, "rgba(99,102,241,.45)");
    g2.addColorStop(1, "rgba(99,102,241,.03)");

    CH1 = new Chart(ctx, {
      type: "line",
      data: {
        labels: X,
        datasets: [
          {
            label: "% Menerima Perkhidmatan",
            data: A.series,
            borderColor: "#f59e0b",
            backgroundColor: g1,
            borderWidth: 3,
            tension: 0.45,
            fill: true,
            yAxisID: "y1",
            pointRadius: (c) =>
              c.dataIndex === 0 || c.dataIndex === X.length - 1 ? 0 : 3,
          },
          {
            label: "Anggaran Penduduk",
            data: P.series,
            borderColor: "#6366f1",
            backgroundColor: g2,
            borderWidth: 3,
            tension: 0.45,
            fill: true,
            yAxisID: "y2",
            pointRadius: (c) =>
              c.dataIndex === 0 || c.dataIndex === X.length - 1 ? 0 : 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            filter: (i) =>
              !(i.dataIndex === 0 || i.dataIndex === X.length - 1),
            callbacks: {
              label: (c) =>
                c.datasetIndex === 0
                  ? " Akses: " + c.parsed.y + "%"
                  : " Populasi: " + nice(c.parsed.y),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: mode === "main" ? 90 : 40,
              minRotation: mode === "main" ? 90 : 40,
              callback: (v, i) => (i === 0 || i === X.length - 1 ? "" : X[i]),
            },
          },
          y1: {
            position: "left",
            beginAtZero: true,
            ticks: { callback: (v) => v + "%" },
          },
          y2: {
            position: "right",
            beginAtZero: true,
            grid: { display: false },
            ticks: { callback: (v) => nice(v) },
          },
        },
      },
    });

    try {
      const core = A.series.slice(1, -1).concat(P.series.slice(1, -1));
      if (allZero(core)) {
        ctx.font = "12px Inter, system-ui";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Tiada data untuk dipaparkan", 12, 22);
      }
    } catch (_e) {}
    return CH1;
  }

  async function loadT1() {
    const err = $("t1err");
    err.style.display = "none";
    try {
      const csv = await fetchCSV(CSV1);
      RAW1 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      const popRow = RAW1[9] || [];
      const accRow = RAW1[10] || [];
      const rows = DIST1.map((d) => {
        const i = colIdx(d.L);
        let a = cleanPct(accRow[i]);
        if (a == null) a = cleanInt(accRow[i]) || 0;
        const p = cleanInt(popRow[i]);
        return { n: d.n, a, p };
      });
      drawT1(rows, "t1", "main");
      $("t1time").textContent = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      err.textContent = "Gagal memuatkan CSV (Tile 1).";
      err.style.display = "block";
    }
  }

  $("t1refresh").addEventListener("click", loadT1);
  $("t1expand").addEventListener("click", () => {
    if (!RAW1) return;
    openModal("Akses Kepada Perkhidmatan Kesihatan Pergigian");
    const popRow = RAW1[9] || [];
    const accRow = RAW1[10] || [];
    const rows = DIST1.map((d) => {
      const i = colIdx(d.L);
      return {
        n: d.n,
        a: cleanPct(accRow[i]) || 0,
        p: cleanInt(popRow[i]),
      };
    });
    MCH = drawT1(rows, "mcanvas", "modal");
  });
  loadT1();

  // ============== Tile 2 (Primer) =========
  const CSV2 =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1808391684&single=true&output=csv";
  const DIST2 = [
    { n: "Kota Setar", L: "D" },
    { n: "Pendang", L: "E" },
    { n: "Kuala Muda", L: "F" },
    { n: "Sik", L: "G" },
    { n: "Kulim", L: "H" },
    { n: "Bandar Baru", L: "I" },
    { n: "Kubang Pasu", L: "J" },
    { n: "Padang Terap", L: "K" },
    { n: "Baling", L: "L" },
    { n: "Yan", L: "M" },
    { n: "Langkawi", L: "N" },
    { n: "Kedah", L: "O" },
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
    { key: "Bukan warganegara", b: [38], u: [39] },
  ];
  const COLORS2 = {
    "<5 tahun": "#0ea5e9",
    "5-6 tahun": "#4f46e5",
    "7-12 tahun": "#10b981",
    "13-17 tahun": "#ef4444",
    "18-59 tahun": "#8b5cf6",
    "<60 tahun": "#14b8a6",
    "Ibu mengandung": "#f59e0b",
    OKU: "#22c55e",
    "Bukan warganegara": "#a855f7",
  };
  let RAW2 = null;
  let CH2 = null;

  const sumCol = (arr, L, rows) =>
    rows.reduce((t, r) => t + cellInt(arr, L + String(r)), 0);

  const chosen2 = () => chosen("dd2menu", "<5 tahun");
  function buildDD2() {
    buildDD(
      "dd2menu",
      "dd2all",
      "dd2none",
      "dd2close",
      CATS2.map((c) => c.key),
      "<5 tahun"
    );
  }
  function computeT2(arr, keys) {
    const labels = ["", ...DIST2.map((d) => d.n), ""];
    const per = [];
    CATS2.forEach((c) => {
      if (!keys.has(c.key)) return;
      const b = [0];
      const u = [0];
      DIST2.forEach((d) => {
        b.push(sumCol(arr, d.L, c.b));
        u.push(sumCol(arr, d.L, c.u));
      });
      b.push(0);
      u.push(0);
      per.push({ key: c.key, b, u });
    });
    return { labels, per };
  }
  function drawT2(data, canvas, mode) {
    if (CH2) CH2.destroy();
    const sets = [];
    data.per.forEach((c) => {
      const color = COLORS2[c.key] || "#64748b";
      sets.push({
        label: c.key + " • Baru",
        data: c.b,
        borderColor: color,
        backgroundColor: "transparent",
        borderWidth: 3,
        tension: 0.45,
        fill: false,
      });
      sets.push({
        label: c.key + " • Ulangan",
        data: c.u,
        borderColor: color,
        backgroundColor: "transparent",
        borderWidth: 3,
        tension: 0.45,
        fill: false,
        borderDash: [6, 4],
      });
    });
    CH2 = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: sets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            filter: (i) =>
              !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1),
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: mode === "main" ? 90 : 40,
              minRotation: mode === "main" ? 90 : 40,
              callback: (v, i) =>
                i === 0 || i === data.labels.length - 1 ? "" : data.labels[i],
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(15,23,42,.06)" },
            ticks: { callback: (v) => Number(v).toLocaleString() },
          },
        },
      },
    });
    try {
      const core = data.per.flatMap((c) =>
        c.b.slice(1, -1).concat(c.u.slice(1, -1))
      );
      if (allZero(core)) {
        const ctx = $(canvas).getContext("2d");
        ctx.font = "12px Inter, system-ui";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Tiada data untuk dipaparkan", 12, 22);
      }
    } catch (_e) {}
    return CH2;
  }
  function refreshT2Tags() {
    const set = chosen2();
    const tags = $("dd2tags");
    const leg = $("t2legend");
    tags.innerHTML = "";
    leg.innerHTML = "";
    Array.from(set).forEach((k) => {
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = k;
      tags.appendChild(s);
      const el = document.createElement("span");
      el.className = "lg";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = COLORS2[k] || "#64748b";
      const tx = document.createElement("span");
      tx.textContent = k;
      el.appendChild(dot);
      el.appendChild(tx);
      leg.appendChild(el);
    });
  }
  async function loadT2() {
    const err = $("t2err");
    err.style.display = "none";
    try {
      buildDD2();
      const csv = await fetchCSV(CSV2);
      RAW2 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT2Tags();
      drawT2(computeT2(RAW2, chosen2()), "t2", "main");
      $("dd2btn").onclick = () => $("dd2menu").classList.toggle("open");
      $("dd2menu")
        .querySelectorAll("input")
        .forEach((i) =>
          i.addEventListener("change", () => {
            refreshT2Tags();
            drawT2(computeT2(RAW2, chosen2()), "t2", "main");
          })
        );
      document.addEventListener("click", (e) => {
        const box = $("dd2");
        if (box && !box.contains(e.target)) $("dd2menu").classList.remove("open");
      });
      $("t2time").textContent = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      err.textContent = "Gagal memuatkan CSV (Tile 2).";
      err.style.display = "block";
    }
  }
  $("t2refresh").addEventListener("click", loadT2);
  $("t2expand").addEventListener("click", () => {
    if (!RAW2) return;
    openModal("Kedatangan Pesakit Primer");
    MCH = drawT2(computeT2(RAW2, chosen2()), "mcanvas", "modal");
  });
  loadT2();

  // ============== Tile 3 (Outreach) =======
  const CSV3 =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1032207232&single=true&output=csv";
  const DIST3 = DIST2.slice();
  const SVCS = [
    { key: "Primer", b: 6, u: 7, color: "#0ea5e9" },
    { key: "Outreach", b: 10, u: 11, color: "#10b981" },
    { key: "UTC", b: 14, u: 15, color: "#f59e0b" },
    { key: "RTC", b: 18, u: 19, color: "#ef4444" },
    { key: "TASTAD", b: 22, u: 23, color: "#8b5cf6" },
    { key: "Sekolah", b: 26, u: 27, color: "#14b8a6" },
  ];
  let RAW3 = null;
  let CH3 = null;

  const chosen3 = () => chosen("dd3menu", "Primer");
  const buildDD3 = () =>
    buildDD(
      "dd3menu",
      "dd3all",
      "dd3none",
      "dd3close",
      SVCS.map((s) => s.key),
      "Primer"
    );

  function computeT3(arr, set) {
    const labels = ["", ...DIST3.map((d) => d.n), ""];
    const per = [];
    SVCS.forEach((s) => {
      if (!set.has(s.key)) return;
      const b = [0];
      const u = [0];
      DIST3.forEach((d) => {
        b.push(cellInt(arr, d.L + String(s.b)));
        u.push(cellInt(arr, d.L + String(s.u)));
      });
      b.push(0);
      u.push(0);
      per.push({ key: s.key, color: s.color, b, u });
    });
    return { labels, per };
  }
  function drawT3(data, canvas, mode) {
    if (CH3) CH3.destroy();
    const sets = [];
    data.per.forEach((s) => {
      sets.push({
        label: s.key + " • Baru",
        data: s.b,
        borderColor: s.color,
        backgroundColor: "transparent",
        borderWidth: 3,
        tension: 0.45,
        fill: false,
      });
      sets.push({
        label: s.key + " • Ulangan",
        data: s.u,
        borderColor: s.color,
        backgroundColor: "transparent",
        borderWidth: 3,
        tension: 0.45,
        fill: false,
        borderDash: [6, 4],
      });
    });
    CH3 = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: sets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            filter: (i) =>
              !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1),
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: mode === "main" ? 90 : 40,
              minRotation: mode === "main" ? 90 : 40,
              callback: (v, i) =>
                i === 0 || i === data.labels.length - 1 ? "" : data.labels[i],
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(15,23,42,.06)" },
            ticks: { callback: (v) => Number(v).toLocaleString() },
          },
        },
      },
    });
    try {
      const core = data.per.flatMap((s) =>
        s.b.slice(1, -1).concat(s.u.slice(1, -1))
      );
      if (allZero(core)) {
        const ctx = $(canvas).getContext("2d");
        ctx.font = "12px Inter, system-ui";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Tiada data untuk dipaparkan", 12, 22);
      }
    } catch (_e) {}
    return CH3;
  }
  function refreshT3Tags() {
    const set = chosen3();
    const tags = $("dd3tags");
    const leg = $("t3legend");
    tags.innerHTML = "";
    leg.innerHTML = "";
    Array.from(set).forEach((k) => {
      const svc = SVCS.find((s) => s.key === k);
      const c = svc ? svc.color : "#64748b";
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = k;
      tags.appendChild(s);
      const el = document.createElement("span");
      el.className = "lg";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = c;
      const tx = document.createElement("span");
      tx.textContent = k;
      el.appendChild(dot);
      el.appendChild(tx);
      leg.appendChild(el);
    });
  }
  async function loadT3() {
    const err = $("t3err");
    err.style.display = "none";
    try {
      buildDD3();
      const csv = await fetchCSV(CSV3);
      RAW3 = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT3Tags();
      drawT3(computeT3(RAW3, chosen3()), "t3", "main");
      $("dd3btn").onclick = () => $("dd3menu").classList.toggle("open");
      $("dd3menu")
        .querySelectorAll("input")
        .forEach((i) =>
          i.addEventListener("change", () => {
            refreshT3Tags();
            drawT3(computeT3(RAW3, chosen3()), "t3", "main");
          })
        );
      document.addEventListener("click", (e) => {
        const box = $("dd3");
        if (box && !box.contains(e.target)) $("dd3menu").classList.remove("open");
      });
      $("t3time").textContent = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      err.textContent = "Gagal memuatkan CSV (Tile 3).";
      err.style.display = "block";
    }
  }
  $("t3refresh").addEventListener("click", loadT3);
  $("t3expand").addEventListener("click", () => {
    if (!RAW3) return;
    openModal("Kedatangan Pesakit Outreach");
    MCH = drawT3(computeT3(RAW3, chosen3()), "mcanvas", "modal");
  });
  loadT3();

  // ============== Tile 4 (Kepakaran) ======
  const CSV4_SPEC =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=666852668&single=true&output=csv";
  const SPEC = {
    OMF: {
      color: "#0ea5e9",
      cols: [
        { n: "Kota Setar", L: "C" },
        { n: "Kuala Muda", L: "D" },
        { n: "Kulim", L: "E" },
        { n: "Kubang Pasu", L: "F" },
        { n: "Langkawi", L: "G" },
        { n: "Yan", L: "H" },
        { n: "Baling", L: "I" },
        { n: "Pendang", L: "J" },
        { n: "Jumlah OMF", L: "K" },
        { n: "Reten Negeri", L: "L" },
      ],
    },
    Paeds: {
      color: "#8b5cf6",
      cols: [
        { n: "Kota Setar", L: "M" },
        { n: "Kuala Muda", L: "N" },
        { n: "Kulim", L: "O" },
        { n: "Langkawi", L: "P" },
        { n: "Baling", L: "Q" },
        { n: "Bandar Baru", L: "R" },
        { n: "Jumlah Paeds", L: "S" },
        { n: "Reten Negeri Paeds", L: "T" },
      ],
    },
    Ortho: {
      color: "#ef4444",
      cols: [
        { n: "Kota Setar", L: "U" },
        { n: "Kuala Muda", L: "V" },
        { n: "Kulim", L: "W" },
        { n: "Kubang Pasu", L: "X" },
        { n: "Langkawi", L: "Y" },
        { n: "Baling", L: "Z" },
        { n: "Jumlah Ortho", L: "AA" },
        { n: "Reten Negeri Ortho", L: "AB" },
      ],
    },
    Perio: {
      color: "#10b981",
      cols: [
        { n: "Kota Setar", L: "AC" },
        { n: "Kuala Muda", L: "AD" },
        { n: "Baling", L: "AE" },
        { n: "Langkawi", L: "AG" },
        { n: "Padang Terap", L: "AH" },
        { n: "Sik", L: "AI" },
        { n: "Kulim", L: "AJ" },
        { n: "Jumlah Perio", L: "AK" },
        { n: "Reten Negeri Perio", L: "AL" },
      ],
    },
    Resto: {
      color: "#f59e0b",
      cols: [
        { n: "Kota Setar", L: "AM" },
        { n: "Kuala Muda", L: "AN" },
        { n: "Kulim", L: "AO" },
        { n: "Baling", L: "AP" },
        { n: "Kubang Pasu", L: "AQ" },
        { n: "Langkawi", L: "AR" },
        { n: "Jumlah Resto", L: "AS" },
        { n: "Reten Negeri Resto", L: "AT" },
      ],
    },
    OMOP: {
      color: "#14b8a6",
      cols: [
        { n: "Kota Setar", L: "AV" },
        { n: "Kuala Muda", L: "AU" },
        { n: "Jumlah OMOP", L: "AW" },
        { n: "Reten Negeri OMOP", L: "AX" },
      ],
    },
    DPH: {
      color: "#a855f7",
      cols: [
        { n: "Kota Setar", L: "AY" },
        { n: "Kota Setar Reten Negeri", L: "AZ" },
      ],
    },
  };
  let RAW4S = null;
  let CH4S = null;

  const buildDD4S = () =>
    buildDD("dd4menu", "dd4all", "dd4none", "dd4close", Object.keys(SPEC), "OMF");
  function chosen4S() {
    const menu = $("dd4menu");
    let pick = null;
    menu.querySelectorAll("input").forEach((i) => {
      if (i.checked && !pick) pick = i.getAttribute("data-k");
    });
    return pick || "OMF";
  }
  function refreshT4STags() {
    const k = chosen4S();
    const tags = $("dd4tags");
    const leg = $("t4legend");
    tags.innerHTML = "";
    leg.innerHTML = "";
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = k;
    tags.appendChild(s);
    const el = document.createElement("span");
    el.className = "lg";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = SPEC[k] && SPEC[k].color ? SPEC[k].color : "#64748b";
    const tx = document.createElement("span");
    tx.textContent = "Baru • Ulangan";
    el.appendChild(dot);
    el.appendChild(tx);
    leg.appendChild(el);
  }
  function computeT4S(arr, key) {
    const grp = SPEC[key];
    if (!grp) return { labels: [], b: [], u: [], color: "#64748b" };
    const labels = ["", ...grp.cols.map((x) => x.n), ""];
    const b = [0];
    const u = [0];
    grp.cols.forEach((d) => {
      b.push(cellIntPlus(arr, d.L + "28"));
      u.push(cellIntPlus(arr, d.L + "29"));
    });
    b.push(0);
    u.push(0);
    return { labels, b, u, color: grp.color };
  }
  function drawT4S(data, canvas, mode) {
    if (CH4S) CH4S.destroy();
    CH4S = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Baru",
            data: data.b,
            borderColor: data.color,
            backgroundColor: "transparent",
            borderWidth: 3,
            tension: 0.45,
            fill: false,
          },
          {
            label: "Ulangan",
            data: data.u,
            borderColor: data.color,
            backgroundColor: "transparent",
            borderWidth: 3,
            tension: 0.45,
            fill: false,
            borderDash: [6, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            filter: (i) =>
              !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1),
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: mode === "main" ? 90 : 40,
              minRotation: mode === "main" ? 90 : 40,
              callback: (v, i) =>
                i === 0 || i === data.labels.length - 1 ? "" : data.labels[i],
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(15,23,42,.06)" },
            ticks: { callback: (v) => Number(v).toLocaleString() },
          },
        },
      },
    });
    try {
      const core = data.b.slice(1, -1).concat(data.u.slice(1, -1));
      if (allZero(core)) {
        const ctx = $(canvas).getContext("2d");
        ctx.font = "12px Inter, system-ui";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Tiada data untuk dipaparkan", 12, 22);
      }
    } catch (_e) {}
    return CH4S;
  }
  async function loadT4S() {
    const err = $("t4err");
    err.style.display = "none";
    try {
      buildDD4S();
      const csv = await fetchCSV(CSV4_SPEC);
      RAW4S = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT4STags();
      drawT4S(computeT4S(RAW4S, chosen4S()), "t4", "main");
      $("dd4btn").onclick = () => $("dd4menu").classList.toggle("open");
      $("dd4menu")
        .querySelectorAll("input")
        .forEach((i) =>
          i.addEventListener("change", () => {
            refreshT4STags();
            drawT4S(computeT4S(RAW4S, chosen4S()), "t4", "main");
          })
        );
      document.addEventListener("click", (e) => {
        const box = $("dd4");
        if (box && !box.contains(e.target)) $("dd4menu").classList.remove("open");
      });
      $("t4time").textContent = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      err.textContent = "Gagal memuatkan CSV (Tile 4).";
      err.style.display = "block";
    }
  }
  $("t4refresh").addEventListener("click", loadT4S);
  $("t4expand").addEventListener("click", () => {
    if (!RAW4S) return;
    openModal("Jumlah Kedatangan Pesakit Pakar");
    MCH = drawT4S(computeT4S(RAW4S, chosen4S()), "mcanvas", "modal");
  });
  loadT4S();

  // ============== Tile 5 (Toddler) ========
  const CSV_TOD =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1851801564&single=true&output=csv";
  const DIST_TOD = DIST2.slice();
  const MET_TOD = [
    { key: "% TASKA dilawati", row: 12, type: "pct", color: "#0ea5e9" },
    { key: "% Liputan Toddler", row: 17, type: "pct", color: "#10b981", target: 25 },
    { key: "% 'Lift the Lip'", row: 22, type: "pct", color: "#f59e0b", target: 50 },
    { key: "% Maintaining Orally Fit", row: 28, type: "pct", color: "#8b5cf6", target: 75 },
    { key: "% Sapuan Fluoride Varnish", row: 32, type: "pct", color: "#ef4444", target: 70 },
    { key: "Bil. Ibubapa diberi 'AG'", row: 33, type: "cnt", color: "#22c55e" },
  ];
  let RAW_TOD = null;
  let CH_TOD = null;

  function buildDD5() {
    buildDD(
      "dd5menu",
      "dd5all",
      "dd5none",
      "dd5close",
      MET_TOD.map((m) => m.key),
      "% TASKA dilawati"
    );
  }
  const chosen5 = () => chosen("dd5menu", "% TASKA dilawati");
  function computeT5(arr, set) {
    const labels = ["", ...DIST_TOD.map((d) => d.n), ""];
    const per = [];
    MET_TOD.forEach((m) => {
      if (!set.has(m.key)) return;
      const s = [0];
      DIST_TOD.forEach((d) =>
        s.push(m.type === "pct" ? cellPct(arr, d.L + String(m.row)) : cellInt(arr, d.L + String(m.row)))
      );
      s.push(0);
      per.push({ key: m.key, type: m.type, color: m.color, target: m.target, data: s });
    });
    return { labels, per };
  }
  function straightLine(len, val) {
    const a = new Array(len);
    for (let i = 0; i < len; i++) a[i] = val;
    return a;
  }
  function drawT5(data, canvas, mode) {
    if (CH_TOD) CH_TOD.destroy();
    const ds = [];
    data.per.forEach((m) => {
      ds.push({
        label: m.key,
        data: m.data,
        borderColor: m.color,
        backgroundColor: "transparent",
        borderWidth: 3,
        tension: 0.45,
        fill: false,
        yAxisID: m.type === "cnt" ? "yR" : "yL",
        borderDash: m.key.indexOf("Lift") > -1 ? [6, 4] : undefined,
      });
      if (m.target != null && m.type !== "cnt") {
        ds.push({
          label: "Sasaran " + m.key.split("%").pop().trim(),
          data: straightLine(m.data.length, m.target),
          borderColor: "#475569",
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          yAxisID: "yL",
        });
      }
    });
    CH_TOD = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            filter: (i) =>
              !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1),
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: mode === "main" ? 90 : 40,
              minRotation: mode === "main" ? 90 : 40,
              callback: (v, i) =>
                i === 0 || i === data.labels.length - 1 ? "" : data.labels[i],
            },
          },
          yL: {
            position: "left",
            beginAtZero: true,
            ticks: { callback: (v) => v + "%" },
          },
          yR: {
            position: "right",
            beginAtZero: true,
            grid: { display: false },
            ticks: { callback: (v) => nice(v) },
          },
        },
      },
    });
    try {
      const core = data.per.flatMap((m) => m.data.slice(1, -1));
      if (allZero(core)) {
        const ctx = $(canvas).getContext("2d");
        ctx.font = "12px Inter, system-ui";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Tiada data untuk dipaparkan", 12, 22);
      }
    } catch (_e) {}
    return CH_TOD;
  }
  function refreshT5Tags() {
    const set = chosen5();
    const tags = $("dd5tags");
    const leg = $("t5legend");
    tags.innerHTML = "";
    leg.innerHTML = "";
    Array.from(set).forEach((k) => {
      const m = MET_TOD.find((x) => x.key === k);
      const c = m ? m.color : "#64748b";
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = k;
      tags.appendChild(s);
      const el = document.createElement("span");
      el.className = "lg";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = c;
      const tx = document.createElement("span");
      tx.textContent = k;
      el.appendChild(dot);
      el.appendChild(tx);
      leg.appendChild(el);
    });
  }
  async function loadT5() {
    const err = $("t5err");
    err.style.display = "none";
    try {
      buildDD5();
      const csv = await fetchCSV(CSV_TOD);
      RAW_TOD = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      $("dd5btn").onclick = () => $("dd5menu").classList.toggle("open");
      $("dd5menu")
        .querySelectorAll("input")
        .forEach((i) =>
          i.addEventListener("change", () => {
            refreshT5Tags();
            drawT5(computeT5(RAW_TOD, chosen5()), "t5", "main");
          })
        );
      document.addEventListener("click", (e) => {
        const box = $("dd5");
        if (box && !box.contains(e.target)) $("dd5menu").classList.remove("open");
      });
      refreshT5Tags();
      drawT5(computeT5(RAW_TOD, chosen5()), "t5", "main");
      $("t5time").textContent = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      err.textContent = "Gagal memuatkan CSV (Tile 5).";
      err.style.display = "block";
    }
  }
  $("t5refresh").addEventListener("click", loadT5);
  $("t5expand").addEventListener("click", () => {
    if (!RAW_TOD) return;
    openModal("Pencapaian Program Toddler");
    MCH = drawT5(computeT5(RAW_TOD, chosen5()), "mcanvas", "modal");
  });
  loadT5();

  // ============== Tile 6 (Ibu Mengandung) =
  const CSV_PREG =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=205423549&single=true&output=csv";
  const DIST_PREG = [
    { n: "Kota Setar", L: "D" },
    { n: "Pendang", L: "E" },
    { n: "Kuala Muda", L: "F" },
    { n: "Sik", L: "G" },
    { n: "Kulim", L: "H" },
    { n: "Bandar Baru", L: "I" },
    { n: "Kubang Pasu", L: "J" },
    { n: "Padang Terap", L: "K" },
    { n: "Baling", L: "L" },
    { n: "Yan", L: "M" },
    { n: "Langkawi", L: "N" },
    { n: "Kedah", L: "O" },
    { n: "G-RET NEGERI", L: "P" },
  ];
  const MET_PREG = [
    { key: "% Liputan Ibu Mengandung", row: 8, color: "#0ea5e9", target: 70 },
    { key: "% Liputan Ibu Mengandung diberi PKP", row: 14, color: "#8b5cf6", target: 90 },
    { key: "% Ibu Mengandung mencapai status Orally Fit", row: 19, color: "#10b981", target: 25 },
  ];
  let RAW_PREG = null;
  let CH_PREG = null;

  const buildDD6 = () =>
    buildDD(
      "dd6menu",
      "dd6all",
      "dd6none",
      "dd6close",
      MET_PREG.map((m) => m.key),
      MET_PREG[0].key
    );
  const chosen6 = () => chosen("dd6menu", MET_PREG[0].key);
  function computeT6(arr, set) {
    const labels = ["", ...DIST_PREG.map((d) => d.n), ""];
    const per = [];
    MET_PREG.forEach((m) => {
      if (!set.has(m.key)) return;
      const s = [0];
      DIST_PREG.forEach((d) => s.push(cellPct(arr, d.L + String(m.row))));
      s.push(0);
      per.push({ key: m.key, color: m.color, target: m.target, data: s });
    });
    return { labels, per };
  }
  function drawT6(data, canvas, mode) {
    if (CH_PREG) CH_PREG.destroy();
    const ds = [];
    data.per.forEach((m) => {
      ds.push({
        label: m.key,
        data: m.data,
        borderColor: m.color,
        backgroundColor: "transparent",
        borderWidth: 3,
        tension: 0.45,
        fill: false,
        yAxisID: "y",
      });
      if (m.target != null) {
        const flat = new Array(m.data.length).fill(m.target);
        ds.push({
          label: "Sasaran " + m.key,
          data: flat,
          borderColor: "#475569",
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          yAxisID: "y",
        });
      }
    });
    CH_PREG = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            filter: (i) =>
              !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1),
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: mode === "main" ? 90 : 40,
              minRotation: mode === "main" ? 90 : 40,
              callback: (v, i) =>
                i === 0 || i === data.labels.length - 1 ? "" : data.labels[i],
            },
          },
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => v + "%" },
          },
        },
      },
    });
    try {
      const core = data.per.flatMap((m) => m.data.slice(1, -1));
      if (allZero(core)) {
        const ctx = $(canvas).getContext("2d");
        ctx.font = "12px Inter, system-ui";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("Tiada data untuk dipaparkan", 12, 22);
      }
    } catch (_e) {}
    return CH_PREG;
  }
  function refreshT6Tags() {
    const set = chosen6();
    const tags = $("dd6tags");
    const leg = $("t6legend");
    tags.innerHTML = "";
    leg.innerHTML = "";
    Array.from(set).forEach((k) => {
      const m = MET_PREG.find((x) => x.key === k);
      const c = m ? m.color : "#64748b";
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = k;
      tags.appendChild(s);
      const el = document.createElement("span");
      el.className = "lg";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = c;
      const tx = document.createElement("span");
      tx.textContent = k;
      el.appendChild(dot);
      el.appendChild(tx);
      leg.appendChild(el);
    });
  }
  async function loadT6() {
    const err = $("t6err");
    err.style.display = "none";
    try {
      buildDD6();
      const csv = await fetchCSV(CSV_PREG);
      RAW_PREG = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT6Tags();
      drawT6(computeT6(RAW_PREG, chosen6()), "t6", "main");
      $("dd6btn").onclick = () => $("dd6menu").classList.toggle("open");
      $("dd6menu")
        .querySelectorAll("input")
        .forEach((i) =>
          i.addEventListener("change", () => {
            refreshT6Tags();
            drawT6(computeT6(RAW_PREG, chosen6()), "t6", "main");
          })
        );
      document.addEventListener("click", (e) => {
        const box = $("dd6");
        if (box && !box.contains(e.target)) $("dd6menu").classList.remove("open");
      });
      $("t6time").textContent = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      err.textContent = "Gagal memuatkan CSV (Tile 6).";
      err.style.display = "block";
    }
  }
  $("t6refresh").addEventListener("click", loadT6);
  $("t6expand").addEventListener("click", () => {
    if (!RAW_PREG) return;
    openModal("Liputan Ibu Mengandung");
    MCH = drawT6(computeT6(RAW_PREG, chosen6()), "mcanvas", "modal");
  });
  loadT6();

  // ============== Tile 7 (YA) =============
  const CSV_YA =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=543945307&single=true&output=csv";
  const DIST_YA = DIST2.slice();
  const MET_YA = [
    { key: "Peratus tidak perlu rawatan", row: 8, color: "#0ea5e9", target: 70 },
    { key: "Peratus kes selesai (Orally Fit)", row: 14, color: "#10b981", target: 70 },
  ];
  let RAW_YA = null;
  let CH_YA = null;

  function buildDD7() {
    buildDD(
      "dd7menu",
      "dd7all",
      "dd7none",
      "dd7close",
      MET_YA.map((m) => m.key),
      MET_YA[0].key
    );
  }
  const chosen7 = () => chosen("dd7menu", MET_YA[0].key);
  function computeT7(arr, set) {
    const labels = ["", ...DIST_YA.map((d) => d.n), ""];
    const per = [];
    MET_YA.forEach((m) => {
      if (!set.has(m.key)) return;
      const s = [0];
      DIST_YA.forEach((d) => s.push(cellPct(arr, d.L + String(m.row))));
      s.push(0);
      per.push({ key: m.key, color: m.color, target: m.target, data: s });
    });
    return { labels, per };
  }
  function drawT7(data, canvas, mode) {
    if (CH_YA) CH_YA.destroy();
    const ctx = $(canvas).getContext("2d");
    const g1 = ctx.createLinearGradient(0, 0, 0, 260);
    g1.addColorStop(0, "rgba(14,165,233,.35)");
    g1.addColorStop(1, "rgba(14,165,233,.03)");
    const g2 = ctx.createLinearGradient(0, 0, 0, 260);
    g2.addColorStop(0, "rgba(16,185,129,.35)");
    g2.addColorStop(1, "rgba(16,185,129,.03)");
    const ds = [];
    data.per.forEach((m, idx) => {
      ds.push({
        label: m.key,
        data: m.data,
        borderColor: m.color,
        backgroundColor: idx === 0 ? g1 : g2,
        borderWidth: 3,
        tension: 0.45,
        fill: true,
      });
      if (m.target != null) {
        const flat = new Array(m.data.length).fill(m.target);
        ds.push({
          label: "Sasaran " + m.key,
          data: flat,
          borderColor: "#475569",
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
        });
      }
    });
    CH_YA = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            filter: (i) =>
              !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1),
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: mode === "main" ? 90 : 40,
              minRotation: mode === "main" ? 90 : 40,
              callback: (v, i) =>
                i === 0 || i === data.labels.length - 1 ? "" : data.labels[i],
            },
          },
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => v + "%" },
          },
        },
      },
    });
    try {
      const core = data.per.flatMap((m) => m.data.slice(1, -1));
      if (allZero(core)) {
        const c = $(canvas).getContext("2d");
        c.font = "12px Inter, system-ui";
        c.fillStyle = "#94a3b8";
        c.fillText("Tiada data untuk dipaparkan", 12, 22);
      }
    } catch (_e) {}
    return CH_YA;
  }
  function refreshT7Tags() {
    const set = chosen7();
    const tags = $("dd7tags");
    const leg = $("t7legend");
    tags.innerHTML = "";
    leg.innerHTML = "";
    Array.from(set).forEach((k) => {
      const m = MET_YA.find((x) => x.key === k);
      const c = m ? m.color : "#64748b";
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = k;
      tags.appendChild(s);
      const el = document.createElement("span");
      el.className = "lg";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = c;
      const tx = document.createElement("span");
      tx.textContent = k;
      el.appendChild(dot);
      el.appendChild(tx);
      leg.appendChild(el);
    });
  }
  async function loadT7() {
    const err = $("t7err");
    err.style.display = "none";
    try {
      buildDD7();
      const csv = await fetchCSV(CSV_YA);
      RAW_YA = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT7Tags();
      drawT7(computeT7(RAW_YA, chosen7()), "t7", "main");
      $("dd7btn").onclick = () => $("dd7menu").classList.toggle("open");
      $("dd7menu")
        .querySelectorAll("input")
        .forEach((i) =>
          i.addEventListener("change", () => {
            refreshT7Tags();
            drawT7(computeT7(RAW_YA, chosen7()), "t7", "main");
          })
        );
      document.addEventListener("click", (e) => {
        const box = $("dd7");
        if (box && !box.contains(e.target)) $("dd7menu").classList.remove("open");
      });
      $("t7time").textContent = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      err.textContent = "Gagal memuatkan CSV (Tile 7).";
      err.style.display = "block";
    }
  }
  $("t7refresh").addEventListener("click", loadT7);
  $("t7expand").addEventListener("click", () => {
    if (!RAW_YA) return;
    openModal("Young Adult");
    MCH = drawT7(computeT7(RAW_YA, chosen7()), "mcanvas", "modal");
  });
  loadT7();

  // ============== Tile 8 (BPE) ============
  const CSV_BPE =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1983552555&single=true&output=csv";
  const DIST_BPE = DIST2.slice();
  const MET_BPE = [
    { key: "Peratus BPE screening", row: 8, color: "#0ea5e9" },
    { key: "Peratus BPE = 0", row: 13, color: "#10b981" },
  ];
  let RAW_BPE = null;
  let CH_BPE = null;

  function buildDD8() {
    buildDD(
      "dd8menu",
      "dd8all",
      "dd8none",
      "dd8close",
      MET_BPE.map((m) => m.key),
      MET_BPE[0].key
    );
  }
  const chosen8 = () => chosen("dd8menu", MET_BPE[0].key);
  function computeT8(arr, set) {
    const labels = ["", ...DIST_BPE.map((d) => d.n), ""];
    const per = [];
    MET_BPE.forEach((m) => {
      if (!set.has(m.key)) return;
      const s = [0];
      DIST_BPE.forEach((d) => s.push(cellPct(arr, d.L + String(m.row))));
      s.push(0);
      per.push({ key: m.key, color: m.color, data: s });
    });
    return { labels, per };
  }
  function drawT8(data, canvas, mode) {
    if (CH_BPE) CH_BPE.destroy();
    const ctx = $(canvas).getContext("2d");
    const g1 = ctx.createLinearGradient(0, 0, 0, 260);
    g1.addColorStop(0, "rgba(14,165,233,.35)");
    g1.addColorStop(1, "rgba(14,165,233,.03)");
    const g2 = ctx.createLinearGradient(0, 0, 0, 260);
    g2.addColorStop(0, "rgba(16,185,129,.35)");
    g2.addColorStop(1, "rgba(16,185,129,.03)");
    const ds = data.per.map((m, idx) => ({
      label: m.key,
      data: m.data,
      borderColor: m.color,
      backgroundColor: idx === 0 ? g1 : g2,
      borderWidth: 3,
      tension: 0.45,
      fill: true,
    }));
    CH_BPE = new Chart($(canvas).getContext("2d"), {
      type: "line",
      data: { labels: data.labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            filter: (i) =>
              !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1),
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: mode === "main" ? 90 : 40,
              minRotation: mode === "main" ? 90 : 40,
              callback: (v, i) =>
                i === 0 || i === data.labels.length - 1 ? "" : data.labels[i],
            },
          },
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => v + "%" },
          },
        },
      },
    });
    try {
      const core = data.per.flatMap((m) => m.data.slice(1, -1));
      if (allZero(core)) {
        const c = $(canvas).getContext("2d");
        c.font = "12px Inter, system-ui";
        c.fillStyle = "#94a3b8";
        c.fillText("Tiada data untuk dipaparkan", 12, 22);
      }
    } catch (_e) {}
    return CH_BPE;
  }
  function refreshT8Tags() {
    const set = chosen8();
    const tags = $("dd8tags");
    const leg = $("t8legend");
    tags.innerHTML = "";
    leg.innerHTML = "";
    Array.from(set).forEach((k) => {
      const m = MET_BPE.find((x) => x.key === k);
      const c = m ? m.color : "#64748b";
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = k;
      tags.appendChild(s);
      const el = document.createElement("span");
      el.className = "lg";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = c;
      const tx = document.createElement("span");
      tx.textContent = k;
      el.appendChild(dot);
      el.appendChild(tx);
      leg.appendChild(el);
    });
  }
  async function loadT8() {
    const err = $("t8err");
    err.style.display = "none";
    try {
      buildDD8();
      const csv = await fetchCSV(CSV_BPE);
      RAW_BPE = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;
      refreshT8Tags();
      drawT8(computeT8(RAW_BPE, chosen8()), "t8", "main");
      $("dd8btn").onclick = () => $("dd8menu").classList.toggle("open");
      $("dd8menu")
        .querySelectorAll("input")
        .forEach((i) =>
          i.addEventListener("change", () => {
            refreshT8Tags();
            drawT8(computeT8(RAW_BPE, chosen8()), "t8", "main");
          })
        );
      document.addEventListener("click", (e) => {
        const box = $("dd8");
        if (box && !box.contains(e.target)) $("dd8menu").classList.remove("open");
      });
      $("t8time").textContent = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      err.textContent = "Gagal memuatkan CSV (Tile 8).";
      err.style.display = "block";
    }
  }
  $("t8refresh").addEventListener("click", loadT8);
  $("t8expand").addEventListener("click", () => {
    if (!RAW_BPE) return;
    openModal("Basic Periodontal Examination");
    MCH = drawT8(computeT8(RAW_BPE, chosen8()), "mcanvas", "modal");
  });
  loadT8();

  /* ================== Tile 9: Warga Emas ================== */
const CSV_WE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=480846724&single=true&output=csv";

const DIST_WE = [
  { n: "Kota Setar", L: "D" },
  { n: "Pendang", L: "E" },
  { n: "Kuala Muda", L: "F" },
  { n: "Sik", L: "G" },
  { n: "Kulim", L: "H" },
  { n: "Bandar Baru", L: "I" },
  { n: "Kubang Pasu", L: "J" },
  { n: "Pdg Terap", L: "K" },
  { n: "Baling", L: "L" },
  { n: "Yan", L: "M" },
  { n: "Langkawi", L: "N" },
  { n: "Kedah", L: "O" },
];

// Metrics (with types & targets)
const MET_WE = [
  {
    key: "Peratus pesakit baru warga emas mengikut populasi",
    row: 8,
    type: "pct",
    color: "#0ea5e9",
    target: 10,
  },
  {
    key: "Data kehadiran pesakit baru warga emas",
    row: 9,
    type: "cnt",
    color: "#8b5cf6",
  },
  {
    key: "Peratus bilangan institusi dilawati di daerah",
    row: 16,
    type: "pct",
    color: "#10b981",
    target: 100,
  },
  {
    key: "Peratus Warga Emas disaring",
    row: 22,
    type: "pct",
    color: "#f59e0b",
    target: 75,
  },
  {
    key: "% Warga Emas ≥60 thn dengan ≥20 batang gigi",
    row: 39,
    type: "pct",
    color: "#ef4444",
    target: 30,
  },
  // special multi-series option
  {
    key: "PAWE (dalam daerah, dilawati, enrolmen, pesakit baru)",
    type: "pawe",
    color: "#14b8a6",
  },
];

// PAWE rows (counts)
const PAWE_ROWS = { dalam: 24, dilawati: 25, enrolmen: 26, baru: 27 };

let RAW_WE = null;
let CH_WE = null;

function buildDD9() {
  buildDD(
    "dd9menu",
    "dd9all",
    "dd9none",
    "dd9close",
    MET_WE.map((m) => m.key),
    MET_WE[0].key
  );
}
const chosen9 = () => chosen("dd9menu", MET_WE[0].key);

function computeT9(arr, set) {
  const labels = ["", ...DIST_WE.map((d) => d.n), ""];
  const per = [];

  MET_WE.forEach((m) => {
    if (!set.has(m.key)) return;

    if (m.type === "pawe") {
      // four sub-series (counts)
      const sDalam = [0],
        sDilawati = [0],
        sEnrol = [0],
        sBaru = [0];
      DIST_WE.forEach((d) => {
        sDalam.push(cellInt(arr, d.L + String(PAWE_ROWS.dalam)));
        sDilawati.push(cellInt(arr, d.L + String(PAWE_ROWS.dilawati)));
        sEnrol.push(cellInt(arr, d.L + String(PAWE_ROWS.enrolmen)));
        sBaru.push(cellInt(arr, d.L + String(PAWE_ROWS.baru)));
      });
      sDalam.push(0);
      sDilawati.push(0);
      sEnrol.push(0);
      sBaru.push(0);
      per.push({
        key: m.key,
        type: "pawe",
        series: [
          { name: "Bil. PAWE dalam Daerah", color: "#14b8a6", data: sDalam },
          { name: "Bil. PAWE dilawati", color: "#0ea5e9", data: sDilawati },
          { name: "Enrolmen", color: "#8b5cf6", data: sEnrol },
          { name: "Bilangan Pesakit Baru", color: "#f59e0b", data: sBaru },
        ],
      });
    } else {
      const s = [0];
      DIST_WE.forEach((d) =>
        s.push(m.type === "pct" ? cellPct(arr, d.L + String(m.row)) : cellInt(arr, d.L + String(m.row)))
      );
      s.push(0);
      per.push({ key: m.key, type: m.type, color: m.color, target: m.target, data: s });
    }
  });
  return { labels, per };
}

function drawT9(data, canvas, mode) {
  if (CH_WE) CH_WE.destroy();

  // gradients (like Tile 8)
  const ctx = $(canvas).getContext("2d");
  const gA = ctx.createLinearGradient(0, 0, 0, 260);
  gA.addColorStop(0, "rgba(14,165,233,.35)");
  gA.addColorStop(1, "rgba(14,165,233,.03)");
  const gB = ctx.createLinearGradient(0, 0, 0, 260);
  gB.addColorStop(0, "rgba(16,185,129,.35)");
  gB.addColorStop(1, "rgba(16,185,129,.03)");

  const ds = [];
  data.per.forEach((m, idxMetric) => {
    if (m.type === "pawe") {
      m.series.forEach((s, i) => {
        ds.push({
          label: s.name,
          data: s.data,
          borderColor: s.color,
          backgroundColor: i < 2 ? (i === 0 ? gB : gA) : "transparent",
          borderWidth: 3,
          tension: 0.45,
          fill: i < 2, // fill first two for nice shaded look
          yAxisID: "yR", // counts
        });
      });
    } else {
      ds.push({
        label: m.key,
        data: m.data,
        borderColor: m.color,
        backgroundColor: idxMetric % 2 === 0 ? gA : gB,
        borderWidth: 3,
        tension: 0.45,
        fill: true,
        yAxisID: m.type === "cnt" ? "yR" : "yL",
      });
      if (m.target != null && m.type !== "cnt") {
        const flat = new Array(m.data.length).fill(m.target);
        ds.push({
          label: "Sasaran " + m.key,
          data: flat,
          borderColor: "#475569",
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          yAxisID: "yL",
        });
      }
    }
  });

  CH_WE = new Chart($(canvas).getContext("2d"), {
    type: "line",
    data: { labels: data.labels, datasets: ds },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
          filter: (i) => !(i.dataIndex === 0 || i.dataIndex === data.labels.length - 1),
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            autoSkip: false,
            maxRotation: mode === "main" ? 90 : 40,
            minRotation: mode === "main" ? 90 : 40,
            callback: (v, i) => (i === 0 || i === data.labels.length - 1 ? "" : data.labels[i]),
          },
        },
        yL: {
          position: "left",
          beginAtZero: true,
          ticks: { callback: (v) => v + "%" },
        },
        yR: {
          position: "right",
          beginAtZero: true,
          grid: { display: false },
          ticks: { callback: (v) => Number(v).toLocaleString() },
        },
      },
    },
  });

  try {
    const core = data.per.flatMap((m) =>
      m.type === "pawe"
        ? m.series.flatMap((s) => s.data.slice(1, -1))
        : m.data.slice(1, -1)
    );
    if (allZero(core)) {
      ctx.font = "12px Inter, system-ui";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("Tiada data untuk dipaparkan", 12, 22);
    }
  } catch (_) {}
  return CH_WE;
}

function refreshT9Tags() {
  const set = chosen9();
  const tags = $("dd9tags");
  const leg = $("t9legend");
  tags.innerHTML = "";
  leg.innerHTML = "";

  Array.from(set).forEach((k) => {
    const m = MET_WE.find((x) => x.key === k);
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = k;
    tags.appendChild(s);

    if (m && m.type === "pawe") {
      const defs = [
        { n: "Bil. PAWE dalam Daerah", c: "#14b8a6" },
        { n: "Bil. PAWE dilawati", c: "#0ea5e9" },
        { n: "Enrolmen", c: "#8b5cf6" },
        { n: "Bilangan Pesakit Baru", c: "#f59e0b" },
      ];
      defs.forEach((d) => {
        const el = document.createElement("span");
        el.className = "lg";
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.style.background = d.c;
        const tx = document.createElement("span");
        tx.textContent = d.n;
        el.appendChild(dot);
        el.appendChild(tx);
        leg.appendChild(el);
      });
    } else {
      const el = document.createElement("span");
      el.className = "lg";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = m ? m.color : "#64748b";
      const tx = document.createElement("span");
      tx.textContent = k;
      el.appendChild(dot);
      el.appendChild(tx);
      leg.appendChild(el);
    }
  });
}

async function loadT9() {
  const err = $("t9err");
  err.style.display = "none";
  try {
    buildDD9();
    const csv = await fetchCSV(CSV_WE);
    RAW_WE = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;

    refreshT9Tags();
    drawT9(computeT9(RAW_WE, chosen9()), "t9", "main");

    $("dd9btn").onclick = () => $("dd9menu").classList.toggle("open");
    $("dd9menu")
      .querySelectorAll("input")
      .forEach((i) =>
        i.addEventListener("change", () => {
          refreshT9Tags();
          drawT9(computeT9(RAW_WE, chosen9()), "t9", "main");
        })
      );
    document.addEventListener("click", (e) => {
      const box = $("dd9");
      if (box && !box.contains(e.target)) $("dd9menu").classList.remove("open");
    });

    $("t9time").textContent = new Date().toLocaleString();
  } catch (e) {
    console.error(e);
    err.textContent = "Gagal memuatkan CSV (Tile 9).";
    err.style.display = "block";
  }
}
$("t9refresh").addEventListener("click", loadT9);
$("t9expand").addEventListener("click", () => {
  if (!RAW_WE) return;
  openModal("Warga Emas");
  MCH = drawT9(computeT9(RAW_WE, chosen9()), "mcanvas", "modal");
});
loadT9();


  // ============== Redraw on resize =========
  window.addEventListener("resize", function () {
    if (RAW1) {
      const popRow = RAW1[9] || [];
      const accRow = RAW1[10] || [];
      const rows = DIST1.map(function (d) {
        const i = colIdx(d.L);
        return { n: d.n, a: cleanPct(accRow[i]) || 0, p: cleanInt(popRow[i]) };
        });
      drawT1(rows, "t1", "main");
    }
    if (RAW2) drawT2(computeT2(RAW2, chosen2()), "t2", "main");
    if (RAW3) drawT3(computeT3(RAW3, chosen3()), "t3", "main");
    if (RAW4S) drawT4S(computeT4S(RAW4S, chosen4S()), "t4", "main");
    if (RAW_TOD) drawT5(computeT5(RAW_TOD, chosen5()), "t5", "main");
    if (RAW_PREG) drawT6(computeT6(RAW_PREG, chosen6()), "t6", "main");
    if (RAW_YA) drawT7(computeT7(RAW_YA, chosen7()), "t7", "main");
    if (RAW_BPE) drawT8(computeT8(RAW_BPE, chosen8()), "t8", "main");
    if (RAW_WE) drawT9(computeT9(RAW_WE, chosen9()), "t9", "main");
  });
})();

