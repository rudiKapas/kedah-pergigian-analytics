/* =========================================================
   datasets.js  —  Location ➜ Time selector + data registry
   ---------------------------------------------------------
   • You only paste ONE Publish-to-Web BASE link per spreadsheet.
     (BASE ends with “…/pub” — no ?gid, no query.)
   • We add the correct gid (tab) for each page/tile automatically.
   • Built-in axis label helper:
       - Kedah = fixed 12 districts (state view)
       - Districts = read clinic names from header row (default Row 5, Col C)
   ========================================================= */

(function(){
  "use strict";

  /* -----------------------------
     0) Utility helpers (global)
     ----------------------------- */
  function idxToCol(idx){ let s="",n=idx+1; while(n){const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26);} return s; }
  function colIdx(A){ let n=0; for(let i=0;i<A.length;i++) n=n*26+(A.charCodeAt(i)-64); return n-1; }
  function buildCsvURL(base, gid){ return `${base}?gid=${gid}&single=true&output=csv`; }

  // Expose col helpers (handy in page code)
  window.__colIdx = colIdx;
  window.__idxToCol = idxToCol;

  /* ----------------------------------------
     1) Fixed 12-district labels for the state
     ---------------------------------------- */
  const DISTRICTS_12 = [
    "Kota Setar","Pendang","Kuala Muda","Sik","Kulim","Bandar Baru",
    "Kubang Pasu","Pdg Terap","Baling","Yan","Langkawi","Kedah"
  ];

  /* ---------------------------------------------------
     2) TILE → gid map (covers all tiles you listed)
        (Template stays the same; only BASE changes)
     --------------------------------------------------- */
  const TILE_GIDS = {
    // ===== INDEX (4 tiles / counters) =====
    index: {
      i1: 1057141723, // Akses Perkhidmatan Pergigian
      i2: 1851801564, // Toddler
      i3: 205423549,  // Ibu Mengandung
      i4: 480846724   // Warga Emas ≥20 gigi
    },

    // ===== AKSES (9 tiles) =====
    akses: {
      t1: 1057141723, // Akses Kepada Perkhidmatan Kesihatan Pergigian
      t2: 1808391684, // Kedatangan (Primer: Pertama vs Ulangan)
      t3: 1032207232, // Kedatangan (Outreach)
      t4: 666852668,  // Kepakaran / Specialty attendance
      t5: 1851801564, // Toddler Programme
      t6: 205423549,  // Ibu Mengandung
      t7: 543945307,  // Young Adult
      t8: 1983552555, // BPE
      t9: 480846724   // Warga Emas
    },

    // ===== SEKOLAH (3 tiles) =====
    sekolah: {
      ps1: 1190173258, // Pra Sekolah / Tadika
      s2:  282265418,  // Sekolah Rendah
      s3:  1143057439  // Sekolah Menengah
    },

    // ===== KPI (3 tiles) =====
    kpi: {
      k1: 898117748,  // Key Oral Health Goals
      k2: 64245750,   // NIA
      k3: 455214076   // Supporting Oral Health Goals
    },

    // ===== WORKFORCE (3 tiles) =====
    workforce: {
      t1: 68768251,    // Latihan Dalam Perkhidmatan
      t2: 1636304038,  // Purata Hasil Kerja Pegawai Pergigian
      t3: 1636304038   // Purata Hasil Kerja Juruterapi (same gid, other rows)
    },

    // ===== PREVENTION (3 tiles) =====
    prevention: {
      p1: 1006276802, // Clinical Prevention Program for Caries
      p2: 3425549,    // Malaysian Modified ICDAS / Early Lesion & Decay
      p3: 529560061   // Program Berus Gigi / Outreach
    }
  };

  // Quick getter if you ever need the gid in page code
  window.__tileGid = (pageKey, tileKey) => TILE_GIDS?.[pageKey]?.[tileKey] || null;

  /* -------------------------------------------------
     3) DATA_CATALOG — Location ➜ Period ➜ BASE link
        (Paste only the /pub BASE — no ?gid, no query)
     ------------------------------------------------- */
      const DATA_CATALOG = {
        kedah: {
          label: "Kedah",
          periods: {
            "2025_JAN_JUN": {
              label: "Jan–Jun 2025",
              base: "https://docs.google.com/spreadsheets/u/2/d/e/2PACX-1vSmv-uyuolofm_RuuTtXCSApabklB8VYYTs85oqZesufEsrFzCIgqADjOQ7XZtoq0EErPIoJizKyLUG/pub",
              gids: {
                index:   { i1: 1827987097, i2: 580313871,  i3: 1862452815, i4: 367803577 },
                akses:   { t1: 1827987097, t2: 1742536311, t3: 1032207232, t4: 191939163,  t5: 580313871,  t6: 1862452815, t7: 1768020288, t8: 725930955,  t9: 367803577 },
                sekolah: { ps1: 605621560,  s2: 274289184,  s3: 1805739398 },
                kpi:     { k1: 644789028,  k2: 1996563275, k3: 1049078623 },
                workforce:{ t1: 1685402195, t2: 1636304038, t3: 1636304038 },
                prevention:{ p1: 2118307164, p2: 153273302,  p3: 1648630853 }
              }
            },
            "2025_JAN_SEP": {
              label: "Jan–Sep 2025",
              base: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub",
              gids: {
                index:   { i1: 1057141723, i2: 1851801564, i3: 205423549,  i4: 480846724 },
                akses:   { t1: 1057141723, t2: 1808391684, t3: 1032207232, t4: 666852668,  t5: 1851801564, t6: 205423549, t7: 543945307, t8: 1983552555, t9: 480846724 },
                sekolah: { ps1: 1190173258, s2: 282265418,  s3: 1143057439 },
                kpi:     { k1: 898117748,  k2: 64245750,   k3: 455214076 },
                workforce:{ t1: 68768251,   t2: 1636304038, t3: 1636304038 },
                prevention:{ p1: 1006276802, p2: 3425549,    p3: 529560061 }
              }
            }
          }
        },
      
        kuala_muda: {
          label: "Kuala Muda",
          periods: {
            "2025_JAN_SEP": {
              label: "Jan–Sep 2025",
              base: "https://docs.google.com/spreadsheets/u/2/d/e/2PACX-1vScqOZbf5umR9e9ZkI-OzrXHAN4wEf9VtIOn3DHtBUJT91E4TnRnU-cwOtYJ8o48w/pub",
              gids: {
                index:   { i1: 770352707,  i2: 1341968918, i3: 1279182382, i4: 1388051608 },
                akses:   { t1: 770352707,  t2: 1257311077, t3: 615342421,  t4: 843302204,  t5: 1341968918, t6: 1279182382, t7: 1457887816, t8: 541683565,  t9: 1388051608 },
                sekolah: { ps1: 1360946115, s2: 1478225603, s3: 491917070 },
                kpi:     { k1: 2063069096, k2: 1008078167, k3: 950287696 },
                workforce:{ t1: 509804948,  t2: 2079002616, t3: 2079002616 },
                prevention:{ p1: 1360786374, p2: 10143760,   p3: 30431784 }
              }
            }
          }
        }
      };


  // Defaults (when first loaded)
  const DEFAULT_LOCATION = "kedah";
  const DEFAULT_PERIOD   = "2025_JAN_SEP";

  function getSel(){
    const loc = localStorage.getItem("dash_loc") || DEFAULT_LOCATION;
    const per = localStorage.getItem("dash_per") || DEFAULT_PERIOD;
    return { loc, per };
  }
  function setSel(loc, per){
    if (DATA_CATALOG[loc]) localStorage.setItem("dash_loc", loc);
    if (DATA_CATALOG[loc]?.periods?.[per]) localStorage.setItem("dash_per", per);
  }

  // Build final CSV for a page+tile under current selection (prefers per-period gid overrides)
   window.__pickURL = function(pageKey, tileKey){
     const { loc, per } = getSel();
     const perObj = DATA_CATALOG?.[loc]?.periods?.[per];
     if (!perObj?.base) { console.error("[datasets] BASE missing for", loc, per); return ""; }
   
     // Prefer per-period override gid; fallback to global TILE_GIDS (Kedah template)
     const overrideGid = perObj?.gids?.[pageKey]?.[tileKey];
     const fallbackGid = TILE_GIDS?.[pageKey]?.[tileKey];
     const gid = overrideGid ?? fallbackGid;
     if (!gid) { console.warn("[datasets] Unknown page/tile:", pageKey, tileKey); return ""; }
   
     return buildCsvURL(perObj.base, gid);
   };


  // Optional info to display current selection
  window.__getSelectionLabels = function(){
    const { loc, per } = getSel();
    return {
      location: DATA_CATALOG[loc]?.label || loc,
      period:   DATA_CATALOG[loc]?.periods?.[per]?.label || per
    };
  };

  // Programmatic selection (if you ever need it)
  window.__setSelection = function(locKey, periodKey){
    setSel(locKey, periodKey);
    location.reload();
  };

  /* ------------------------------------------------------------
     4) Axis label engine (district clinics auto-detected)
        Default: header = Row 5, starting Column = "C"
        You can override per location/page.tile below.
     ------------------------------------------------------------ */
  const AXIS_DEFAULT = { headerRow: 5, startCol: "C" };

  // AXIS_MODE: which selections use fixed 12 districts vs clinic headers
  const AXIS_MODE = {
    kedah:      { type: "state" },                 // stays with 12 fixed districts
    kuala_muda: { type: "district" }               // read clinics from header
    // add more districts with {type:'district'} as you include them
  };

  // Optional fine-grained overrides for header positions when a district is selected.
  // Keys: "<pageKey>.<tileKey>" → { headerRow, startCol }
  // If not provided, we use AXIS_DEFAULT (Row 5, Col C).
  const AXIS_HINTS = {
    // Example overrides (uncomment and edit as needed):
    // kuala_muda: {
    //   "akses.t8": { headerRow: 4, startCol: "D" }, // BPE tab differs
    //   "workforce.t1": { headerRow: 6, startCol: "E" }
    // }
  };

  // Read names from a header row (table = CSV parsed to 2D array)
  function readHeader(table, headerRow, startCol){
    const row = table[(headerRow||AXIS_DEFAULT.headerRow)-1] || [];
    const start = colIdx((startCol||AXIS_DEFAULT.startCol));
    const out = [];
    for (let c = start; c < row.length; c++){
      const val = String(row[c] ?? "").trim();
      if (!val) break;        // stop when header cell is empty
      out.push({ n: val, L: idxToCol(c) }); // {display name, column letter}
    }
    return out;
  }

  // Public: get axis objects for current selection; returns null for state (so you can keep your existing list)
  // Usage in a tile (after you parse CSV to 2D array `table`):
  //   const AX = __axisFor('akses','t8', table) || YOUR_EXISTING_DIST_LIST;
  window.__axisFor = function(pageKey, tileKey, table2D){
    const { loc } = getSel();
    const mode = AXIS_MODE[loc]?.type || "state";
    if (mode === "state") return null; // keep your existing 12-district arrays

    // district mode: find hint
    const pageTileKey = `${pageKey}.${tileKey}`;
    const hint =
      (AXIS_HINTS?.[loc] && AXIS_HINTS[loc][pageTileKey]) ||
      AXIS_DEFAULT;

    return readHeader(table2D || [], hint.headerRow, hint.startCol);
  };

  // For state pages that simply want the 12 labels:
  window.__districts12 = () => DISTRICTS_12.slice();

  /* ---------------------------------------------------------
     5) Minimal UI (top-right) to choose Location & Period
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    const wrap = document.createElement("div");
    wrap.style.cssText = [
      "position:fixed","right:12px","top:12px","z-index:9999",
      "background:#0f172a","color:#fff","border-radius:12px",
      "padding:10px 12px","box-shadow:0 6px 20px rgba(0,0,0,.25)",
      "font:500 12px/1.2 Inter,system-ui","display:flex","gap:8px","align-items:center"
    ].join(";");

    const locLbl = document.createElement("span"); locLbl.textContent = "Lokasi:"; locLbl.style.marginRight="4px";
    const perLbl = document.createElement("span"); perLbl.textContent = "Tempoh:"; perLbl.style.margin = "0 4px 0 8px";

    const locSel = document.createElement("select");
    locSel.style.cssText = "font-size:12px;padding:4px 8px;border-radius:8px";
    Object.entries(DATA_CATALOG).forEach(([locKey, loc])=>{
      const o = document.createElement("option"); o.value = locKey; o.textContent = loc.label || locKey; locSel.appendChild(o);
    });

    const perSel = document.createElement("select");
    perSel.style.cssText = "font-size:12px;padding:4px 8px;border-radius:8px";

    const cur = getSel();
    locSel.value = cur.loc;

    function populatePeriods(locKey){
      perSel.innerHTML = "";
      const periods = DATA_CATALOG[locKey]?.periods || {};
      Object.entries(periods).forEach(([perKey, per])=>{
        const o = document.createElement("option"); o.value = perKey; o.textContent = per.label || perKey; perSel.appendChild(o);
      });
      perSel.value = (cur.per in periods) ? cur.per : Object.keys(periods)[0];
    }
    populatePeriods(locSel.value);

    locSel.addEventListener("change", ()=>{
      const firstPer = Object.keys(DATA_CATALOG[locSel.value].periods)[0];
      setSel(locSel.value, firstPer);
      location.reload();
    });
    perSel.addEventListener("change", ()=>{
      setSel(locSel.value, perSel.value);
      location.reload();
    });

    wrap.appendChild(locLbl); wrap.appendChild(locSel);
    wrap.appendChild(perLbl); wrap.appendChild(perSel);
    document.body.appendChild(wrap);
  });

})();
