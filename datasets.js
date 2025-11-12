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

   /* 1A) Label remap for Kuala Muda (labels only, values unchanged) */
   const LABEL_REMAP = {
        kuala_muda: {
          "Kota Setar":   "KP Sg Petani",
          "Pendang":      "KP Bandar Sg Petani",
          "Kuala Muda":   "KP Taman Intan",
          "Sik":          "KP Bedong",
          "Kulim":        "KP Merbok",
          "Bandar Baru":  "KP Kota Kuala Muda",
          "Kubang Pasu":  "KP UTC",
          "Pdg Terap":    "KP Bukit Selambau",
          "Padang Terap": "KP Bukit Selambau",
          "Baling":       "-",
          "Yan":          "-",
          "Langkawi":     "-",
          "Kedah":        "Daerah Kuala Muda",
          "G-RET NEGERI": "-",
          "G-RET":        "-",
          "GRET":         "-",
          "Giret daerah": "-"
        }
      };

   
   // Export small helpers for app.js
   window.__mapName = function(name){
     const key = String(name || "").trim();
     const { loc } = (typeof getSel === "function" ? getSel() : {loc:null});
     const m = LABEL_REMAP[loc] || null;
     return (m && Object.prototype.hasOwnProperty.call(m, key)) ? m[key] : key;
   };
   window.__mapNames = function(arr){ return (arr||[]).map(n => window.__mapName(n)); };


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
         3a) (Optional) FIXED clinic labels per district
             Use this to hard-lock the x-axis order so we don't rely on messy headers.
         ------------------------------------------------------------ */
      const AXIS_LABELS = {
        kuala_muda: [
          "KP Sg Petani",           // 1. Kota Setar
          "KP Bandar Sg Petani",    // 2. Pendang
          "KP Taman Intan",         // 3. Kuala Muda
          "KP Bedong",              // 4. Sik
          "KP Merbok",              // 5. Kulim
          "KP Kota Kuala Muda",     // 6. Bandar Baru
          "KP UTC",                 // 7. Kubang Pasu
          "KP Bukit Selambau",      // 8. Pdg Terap
          "-",                      // 9. Baling
          "-",                      // 10. Yan
          "-",                      // 11. Langkawi
          "Daerah Kuala Muda"       // 12. Kedah (district total)
          // 13. “Giret daerah” → not shown on axis (treated as "-")
        ]

        // Add more districts later like:
        // kubang_pasu: ["KP A", "KP B", "KP C", "...", "Daerah Kubang Pasu"]
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
        kuala_muda: {
          "akses.t1": { headerRow: 5, startCol: "C" },
          "akses.t2": { headerRow: 5, startCol: "D" },
          "akses.t3": { headerRow: 5, startCol: "C" },
          "akses.t4": { headerRow: 5, startCol: "C" },
          "akses.t5": { headerRow: 5, startCol: "D" },
          "akses.t6": { headerRow: 5, startCol: "D" },
          "akses.t7": { headerRow: 5, startCol: "D" },
          "akses.t8": { headerRow: 5, startCol: "D" },
          "akses.t9": { headerRow: 5, startCol: "D" }
        }
        // Add more districts later with their quirks if needed
      };


        // Read names from a header row (table = CSV parsed to 2D array)
        function readHeader(table, headerRow, startCol){
        // 1) Try explicit hint / default
        const rr = (headerRow||AXIS_DEFAULT.headerRow) - 1;
        const sc = colIdx((startCol||AXIS_DEFAULT.startCol));
        const tryRow = (r,s) => {
          const row = table[r] || [];
          const out = [];
          for (let c = s; c < row.length; c++){
            const val = String(row[c] ?? "").trim();
            if (!val) break;
            out.push({ n: val, L: idxToCol(c) });
          }
          return out;
        };
        let out = tryRow(rr, sc);
        if (out.length >= 2) return out;
      
        // 2) Auto-detect: scan first 12 rows, cols C..AH for a row with ≥3 consecutive non-empty cells.
        const START = colIdx("C"), END = colIdx("AH");
        let best = { len:0, r:-1, s:START };
        for (let r = 0; r < Math.min(12, table.length); r++){
          const row = table[r] || [];
          let run=0, runStart=START;
          for (let c = START; c <= Math.min(END, row.length-1); c++){
            const v = String(row[c] ?? "").trim();
            if (v){
              if (run===0) runStart=c;
              run++;
              if (run > best.len){ best = { len:run, r, s:runStart }; }
            } else {
              run=0;
            }
          }
        }
        if (best.len >= 3){
          const row = table[best.r] || [];
          const out2 = [];
          for (let c = best.s; c < row.length; c++){
            const val = String(row[c] ?? "").trim();
            if (!val) break;
            out2.push({ n: val, L: idxToCol(c) });
          }
          if (out2.length >= 2) return out2;
        }
        return out; // may be empty; caller will handle
      }


  // Public: get axis objects for current selection; returns null for state (so you can keep your existing list)
  // Usage in a tile (after you parse CSV to 2D array `table`):
  //   const AX = __axisFor('akses','t8', table) || YOUR_EXISTING_DIST_LIST;
    window.__axisFor = function(pageKey, tileKey, table2D){
        const { loc } = getSel();
        const mode = AXIS_MODE[loc]?.type || "state";
        if (mode === "state") return null;
      
        const pageTileKey = `${pageKey}.${tileKey}`;
        const hint = (AXIS_HINTS?.[loc] && AXIS_HINTS[loc][pageTileKey]) || AXIS_DEFAULT;
      
        // 1) If we have fixed labels for this district, synthesize axis objects
        //    (We still provide column letters starting from the hinted startCol)
        if (AXIS_LABELS[loc]) {
          const start = colIdx(hint.startCol || AXIS_DEFAULT.startCol);
          return AXIS_LABELS[loc].map((n, i) => ({ n, L: idxToCol(start + i) }));
        }
      
        // 2) Otherwise read from sheet header (hinted row/col → fallback to auto-detect)
        const AX = readHeader(table2D || [], hint.headerRow, hint.startCol);
        return (AX && AX.length >= 2) ? AX : readHeader(table2D || [], undefined, undefined);
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
    wrap.style.right = 'max(12px, calc((100vw - var(--page-max)) / 2 + var(--gap)))';

    document.body.appendChild(wrap);

     /* === Floating radial nav (under the filter bar) === */
      (function(){
        // Place under the filter bar and align the right edge with the grid/header
        const r = wrap.getBoundingClientRect();
        const fab = document.createElement('div');
        fab.className = 'fab';
        fab.style.top   = Math.round(r.bottom + 16) + 'px';
        fab.style.right = 'max(12px, calc((100vw - var(--page-max)) / 2 + var(--gap)))';
      
        // Match the filter bar color
        try {
          const bg = getComputedStyle(wrap).backgroundColor;
          fab.style.setProperty('--fab-bg', bg);
        } catch(e){}
      
        // helper to make a button (with tooltip)
        function makeBtn(href, icon, cls, label){
          const a = document.createElement('a');
          a.className = cls;
          a.href = href;
          a.title = label;                           // native title as fallback
      
          const img = document.createElement('img');
          img.src = icon; img.alt = label;
          a.appendChild(img);
      
          const tip = document.createElement('span');
          tip.className = 'fab-tip';
          tip.textContent = label;
          a.appendChild(tip);
      
          return a;
        }
      
        // MAIN button (default icon: nav.svg; hover icon: home.svg; click → index.html)
        const main = makeBtn('index.html', 'assets/icons/nav.svg', 'fab-main', 'Utama');
        const mainImg = main.querySelector('img');
        main.addEventListener('mouseenter', () => mainImg.src = 'assets/icons/home.svg');
        main.addEventListener('mouseleave', () => mainImg.src = 'assets/icons/nav.svg');
        fab.appendChild(main);
      
        // CHILD buttons (fan out down-left)
        const items = [
          ['akses.html',      'assets/icons/access.svg',     'Akses'],
          ['sekolah.html',    'assets/icons/sekolah.svg',    'Sekolah'],
          ['kpi.html',        'assets/icons/kpi.svg',        'KPI'],
          ['workforce.html',  'assets/icons/workforce.svg',  'Tenaga Kerja'],
          ['prevention.html', 'assets/icons/prevention.svg', 'Pencegahan'],
        ];
        const classes = ['c1','c2','c3','c4','c5'];
        items.forEach(([href, icon, label], i) => {
          fab.appendChild( makeBtn(href, icon, 'fab-child ' + classes[i], label) );
        });
      
        document.body.appendChild(fab);
      
        // Keep it snug under the filter bar on resize
        window.addEventListener('resize', () => {
          const rr = wrap.getBoundingClientRect();
          fab.style.top = Math.round(rr.bottom + 16) + 'px';
        });
      
        // ---- OPEN/CLOSE with delay so users can travel to a child button ----
        let closeTimer = null;
        const open = () => { clearTimeout(closeTimer); fab.classList.add('open'); };
        const close = () => { closeTimer = setTimeout(() => fab.classList.remove('open'), 450); };
      
        fab.addEventListener('mouseenter', open);
        fab.addEventListener('mouseleave', close);
        fab.addEventListener('focusin', open);
        fab.addEventListener('focusout', (e) => {
          if (!fab.contains(e.relatedTarget)) close();
        });
      
        // also open when the main gets hover (snappier)
        main.addEventListener('mouseenter', open);
      })();


  });

})();
