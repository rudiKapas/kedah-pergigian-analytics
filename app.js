(function () {
  "use strict";

  // ==========
  // Helpers
  // ==========
  const $ = (id) => document.getElementById(id);

  function fetchCSV(url) {
    return fetch(url, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  // Get a cell value from parsed CSV (array of arrays), return number.
  // Handles commas, spaces, non-breaking spaces; empty -> 0
  function cellInt(arr, a1) {
    // a1 like "K28" => col letters + row number
    const m = /^([A-Z]+)(\d+)$/.exec(a1.trim());
    if (!m) return 0;
    const [_, letters, rowStr] = m;
    const row = parseInt(rowStr, 10) - 1;
    let col = 0;
    for (let i = 0; i < letters.length; i++) {
      col = col * 26 + (letters.charCodeAt(i) - 64);
    }
    col -= 1;
    const v = (arr[row] && arr[row][col]) ?? "";
    const s = String(v).replace(/\u00A0/g, "").replace(/[, ]+/g, "");
    if (s === "" || s === "-") return 0;
    const num = Number(s);
    return isFinite(num) ? num : 0;
  }

  // Multi-select dropdown builder (re-usable)
  function buildDD(menuId, allId, noneId, closeId, options, defaultSelected) {
    const menu = $(menuId);
    if (!menu) return;
    if (menu.dataset.built) return;
    options.forEach((opt) => {
      const row = document.createElement("label");
      row.className = "opt";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = opt;
      if (Array.isArray(defaultSelected)) {
        input.checked = defaultSelected.includes(opt);
      } else {
        input.checked = opt === defaultSelected;
      }
      const txt = document.createElement("span");
      txt.textContent = opt;
      row.appendChild(input);
      row.appendChild(txt);
      menu.insertBefore(row, menu.querySelector(".mfoot"));
    });
    $(allId).onclick = () => menu.querySelectorAll("input[type=checkbox]").forEach((i) => (i.checked = true));
    $(noneId).onclick = () => menu.querySelectorAll("input[type=checkbox]").forEach((i) => (i.checked = false));
    $(closeId).onclick = () => menu.classList.remove("open");
    menu.dataset.built = "1";
  }
  function chosen(menuId, fallbackOne) {
    const set = new Set();
    const menu = $(menuId);
    if (!menu) return set;
    menu.querySelectorAll("input[type=checkbox]:checked").forEach((i) => set.add(i.value));
    if (set.size === 0 && fallbackOne) set.add(fallbackOne);
    return set;
  }

  // Simple modal
  let MCH = null;
  function openModal(title) {
    $("modal").classList.add("open");
    $("mtitle").textContent = title || "Perincian";
  }
  $("mclose").addEventListener("click", () => {
    $("modal").classList.remove("open");
    if (MCH) { try { MCH.destroy(); } catch(e){} MCH = null; }
  });

  // ======================================================
  // TILE 4 — Kedatangan Pesakit Pakar (Jumlah Baru/Ulangan)
  // ======================================================
  const CSV4S = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=666852668&single=true&output=csv";

  // Kategori umur (multi-select)
  const AGE4S = ["<5 tahun", "5-6 tahun", "7-12 tahun", "13-17 tahun", "18-59 tahun", ">60 tahun", "Jumlah"];
  const COLOR4S = {
    "<5 tahun": "#0ea5e9",
    "5-6 tahun": "#4f46e5",
    "7-12 tahun": "#10b981",
    "13-17 tahun": "#ef4444",
    "18-59 tahun": "#8b5cf6",
    ">60 tahun": "#14b8a6",
    "Jumlah": "#f59e0b"
  };

  // Kolum untuk JUMLAH setiap pakar + kolum Reten Negeri
  const SPEC4S = [
    { key: "OMF",   col: "K",  reten: "L"  },
    { key: "Paeds", col: "S",  reten: "T"  },
    { key: "Ortho", col: "AA", reten: "AB" },
    { key: "Perio", col: "AK", reten: "AL" },
    { key: "Resto", col: "AS", reten: "AT" },
    { key: "OMOP",  col: "AW", reten: "AX" },
    { key: "DPH",   col: "AY", reten: "AZ" }
  ];

  // Pemetaan baris untuk setiap kategori (Jumlah pecahan ikut senarai anda).
  // Perhatian untuk >60 tahun: sesetengah set meletakkan nilai di 26/27.
  const ROWS4S = {
    "<5 tahun":   { b: [4, 6],             u: [5, 7] },
    "5-6 tahun":  { b: [8],                u: [9]    },
    "7-12 tahun": { b: [10, 12],           u: [11, 13] },
    "13-17 tahun":{ b: [14, 16],           u: [15, 17] },
    "18-59 tahun":{ b: [18, 20, 22, 24],   u: [19, 21, 23, 25] },
    ">60 tahun":  { b: [26, 27],           u: [27] }, // guna 26/27 untuk 'baru', 27 untuk ulangan
    "Jumlah":     { b: [28],               u: [29] }
  };

  let RAW4S = null, CH4S = null;

  function buildDD4S() { buildDD("dd4smenu", "dd4sall", "dd4snone", "dd4sclose", AGE4S, "Jumlah"); }
  function chosen4S() { return chosen("dd4smenu", "Jumlah"); }
  function specObj4S() { const sel = $("t4ssvc").value || "OMF"; return SPEC4S.find(s => s.key === sel) || SPEC4S[0]; }

  function sumRows4S(arr, col, rows) { return rows.reduce((t, r) => t + cellInt(arr, col + String(r)), 0); }

  function compute4S(arr, spec, useReten, set) {
    const col = useReten ? spec.reten : spec.col;
    const labels = [], baru = [], ulang = [];
    AGE4S.forEach(k => {
      if (!set.has(k)) return;
      const rows = ROWS4S[k] || { b: [], u: [] };
      labels.push(k);
      baru.push(sumRows4S(arr, col, rows.b));
      ulang.push(sumRows4S(arr, col, rows.u));
    });
    return { labels, baru, ulang };
  }

  function draw4S(data, canvasId) {
    if (CH4S) CH4S.destroy();
    const colors = data.labels.map(k => COLOR4S[k] || "#64748b");

    // Create a softened color for "Ulangan"
    const rgba = (hex, alpha) => {
      if (!/^#([0-9a-f]{6})$/i.test(hex)) return "rgba(100,116,139," + alpha + ")";
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    };

    CH4S = new Chart($(canvasId).getContext("2d"), {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          { label: "Pesakit Baru", data: data.baru, backgroundColor: colors, borderColor: colors, borderWidth: 1 },
          { label: "Pesakit Ulangan", data: data.ulang, backgroundColor: colors.map(c => rgba(c, .35)), borderColor: colors, borderWidth: 1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "top", labels: { color: "#d7ddff" } },
          tooltip: { mode: "index", intersect: false,
            callbacks: {
              label: (ctx) => {
                const v = Number(ctx.parsed.y || 0).toLocaleString();
                return (ctx.dataset.label === "Pesakit Baru" ? " Baru: " : " Ulangan: ") + v;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#b8c1ea" } },
          y: { beginAtZero: true, ticks: { color: "#b8c1ea", callback: (v) => Number(v).toLocaleString() }, grid: { color: "rgba(255,255,255,.07)" } }
        }
      }
    });
    return CH4S;
  }

  function refresh4STags() {
    const set = chosen4S(), tags = $("dd4stags"), leg = $("t4slegend");
    tags.innerHTML = ""; leg.innerHTML = "";
    Array.from(set).forEach(k => {
      const s = document.createElement("span"); s.className = "tag"; s.textContent = k; tags.appendChild(s);
      const el = document.createElement("span"); el.style.display = "inline-flex"; el.style.alignItems = "center"; el.style.gap = "6px";
      const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = COLOR4S[k] || "#64748b";
      const tx = document.createElement("span"); tx.textContent = k; el.appendChild(dot); el.appendChild(tx); leg.appendChild(el);
    });
  }

  async function loadT4S() {
    const err = $("t4serr"); err.style.display = "none"; err.textContent = "";
    try {
      if (!$("dd4smenu").dataset.built) buildDD4S();
      const csv = await fetchCSV(CSV4S);
      RAW4S = Papa.parse(csv, { header: false, skipEmptyLines: true }).data;

      // defaults
      refresh4STags();
      const data = compute4S(RAW4S, specObj4S(), $("t4sreten").checked, chosen4S());
      draw4S(data, "t4s");

      // Wiring
      $("dd4sbtn").onclick = () => $("dd4smenu").classList.toggle("open");
      $("dd4smenu").querySelectorAll("input[type=checkbox]").forEach(i =>
        i.addEventListener("change", () => {
          refresh4STags();
          draw4S(compute4S(RAW4S, specObj4S(), $("t4sreten").checked, chosen4S()), "t4s");
        })
      );
      // Close when clicking outside
      document.addEventListener("click", (e) => {
        const box = $("dd4s");
        if (box && !box.contains(e.target)) $("dd4smenu").classList.remove("open");
      });
      // Change specialty / reten
      $("t4ssvc").addEventListener("change", () => {
        draw4S(compute4S(RAW4S, specObj4S(), $("t4sreten").checked, chosen4S()), "t4s");
      });
      $("t4sreten").addEventListener("change", () => {
        draw4S(compute4S(RAW4S, specObj4S(), $("t4sreten").checked, chosen4S()), "t4s");
      });
      $("t4stime").textContent = new Date().toLocaleString();
    } catch (e) {
      console.error(e);
      err.textContent = "Gagal memuatkan CSV (Tile 4 — Kedatangan Pesakit Pakar).";
      err.style.display = "block";
    }
  }

  // Kick off tile 4
  $("t4srefresh").addEventListener("click", loadT4S);
  $("t4sexpand").addEventListener("click", () => {
    if (!RAW4S) return;
    openModal("Kedatangan Pesakit Pakar");
    const data = compute4S(RAW4S, specObj4S(), $("t4sreten").checked, chosen4S());
    MCH = draw4S(data, "mcanvas");
  });
  loadT4S();

  // ================
  // Window resize
  // ================
  window.addEventListener("resize", () => {
    if (RAW4S) draw4S(compute4S(RAW4S, specObj4S(), $("t4sreten").checked, chosen4S()), "t4s");
  });

  // ==========================
  // (Optional) Placeholder demo for Tiles 1–3
  // ==========================
  const demo = (id, seed) => {
    const ctx = $(id).getContext("2d");
    const data = Array.from({length: 6}, (_,i)=> Math.round(10 + Math.sin(i+seed)*5 + Math.random()*4));
    new Chart(ctx, {
      type:"line",
      data:{ labels:["A","B","C","D","E","F"], datasets:[{label:"Demo", data, borderColor:"#4f46e5"}]},
      options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}}, y:{grid:{color:"rgba(255,255,255,.07)"}}}}
    });
  };
  demo("t1", 0.2); demo("t2", 0.6); demo("t3", 0.9);
  $("t1time").textContent = new Date().toLocaleString();
  $("t2time").textContent = new Date().toLocaleString();
  $("t3time").textContent = new Date().toLocaleString();

})();
