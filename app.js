/* global Papa, Chart */
(function () {
  "use strict";

  // ===== helpers (unchanged) =====
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function colIdx(L){let n=0;for(let i=0;i<L.length;i++)n=n*26+(L.charCodeAt(i)-64);return n-1;}
  function nice(n){n=Number(n)||0;if(n>=1e6)return(n/1e6).toFixed(2)+"M";if(n>=1e3)return(n/1e3).toFixed(1)+"k";return n.toLocaleString();}
  function cleanInt(v){if(v==null)return 0;const s=String(v).replace(/\u00A0/g,"").replace(/[, ]/g,"");const n=Number(s);return isNaN(n)?0:n;}
  function cleanPct(v){ if(v==null)return null; let s=String(v).replace(/\u00A0/g,"").trim(); const hadPct=s.includes("%"); s=s.replace(/%/g,"").replace(/\s+/g,"").replace(/,/g,"."); const parts=s.split("."); if(parts.length>2)s=parts[0]+"."+parts.slice(1).join(""); let n=Number(s); if(isNaN(n))return null; if(!hadPct&&n>0&&n<=1)n*=100; if(!hadPct&&n>1000)return null; return +n.toFixed(2);}
  function rawCell(data, addr){const m=/^([A-Z]+)(\d+)$/.exec(addr); if(!m)return null; const r=parseInt(m[2],10)-1; const c=colIdx(m[1]); return data[r]&&data[r][c]!=null?data[r][c]:null;}
  const cellInt=(d,a)=>cleanInt(rawCell(d,a));
  function cellPct(d,a){const raw=rawCell(d,a); let p=cleanPct(raw); if(p==null){const asInt=cleanInt(raw); p=asInt?asInt:0;} return p;}
  function allZero(arr){if(!Array.isArray(arr))return false; for(let i=0;i<arr.length;i++){const v=arr[i]; if((v==null?0:v)!==0)return false;} return true;}
  async function fetchCSV(url){
    const tries=[url,"https://r.jina.ai/http/"+url.replace(/^https?:\/\//,""),"https://r.jina.ai/http/https://"+url.replace(/^https?:\/\//,"")];
    for(let i=0;i<tries.length;i++){try{const r=await fetch(tries[i],{mode:"cors",cache:"no-store"}); if(!r.ok)throw new Error("bad"); const t=await r.text(); if(t&&t.length>10)return t;}catch(_e){await sleep(120);}}
    throw new Error("CSV fetch failed");
  }

  // ===== modal (unchanged) =====
  const modal=$("modal"), mtitle=$("mtitle"), mclose=$("mclose"); let MCH=null;
  function openModal(title){mtitle.textContent=title||"Perincian"; modal.classList.add("open"); document.documentElement.style.overflow="hidden"; document.body.style.overflow="hidden";}
  function closeModal(){ if(MCH){MCH.destroy(); MCH=null;} modal.classList.remove("open"); document.documentElement.style.overflow=""; document.body.style.overflow=""; }
  mclose.addEventListener("click",closeModal); modal.addEventListener("click",(e)=>{if(e.target===modal)closeModal();});

  // ===== dropdown helpers (unchanged) =====
  function buildDD(menuId,btnAll,btnNone,btnClose,items,def){
    const menu=$(menuId); if(!menu||menu.dataset.built)return;
    const body=menu.querySelector(".menu-body"); const frag=document.createDocumentFragment();
    items.forEach((txt,i)=>{const el=document.createElement("label"); el.className="row"; const checked=(def?txt===def:i===0)?"checked":""; el.innerHTML='<input type="checkbox" data-k="'+txt+'" '+checked+'> '+txt; frag.appendChild(el);});
    body.appendChild(frag); menu.dataset.built="1";
    $(btnAll).addEventListener("click",()=>menu.querySelectorAll("input").forEach(i=>i.checked=true));
    $(btnNone).addEventListener("click",()=>menu.querySelectorAll("input").forEach(i=>i.checked=false));
    $(btnClose).addEventListener("click",()=>menu.classList.remove("open"));
  }
  function chosen(menuId,fb){const s=new Set(); $(menuId).querySelectorAll("input").forEach(i=>{if(i.checked)s.add(i.getAttribute("data-k"));}); if(s.size===0&&fb)s.add(fb); return s;}

  // ====== Tiles 1..8 (keep your existing code exactly) ======
  // (Paste your current Tile 1..8 code block here unchanged.)
  // For brevity in this snippet, I’m omitting them, but keep them as-is from your current app.js.

  /* -------------------- EXISTING TILES FROM YOUR FILE -------------------- */
  // (Use your current definitions for T1..T8 here with no edits)
  /* ---------------------------------------------------------------------- */

  // ====== Tile 9: Warga Emas ======
  const CSV_WE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=480846724&single=true&output=csv";
  const DIST_WE = [
    { n: "Kota Setar", L: "D" }, { n: "Pendang", L: "E" }, { n: "Kuala Muda", L: "F" },
    { n: "Sik", L: "G" }, { n: "Kulim", L: "H" }, { n: "Bandar Baru", L: "I" },
    { n: "Kubang Pasu", L: "J" }, { n: "Pdg Terap", L: "K" }, { n: "Baling", L: "L" },
    { n: "Yan", L: "M" }, { n: "Langkawi", L: "N" }, { n: "Kedah", L: "O" },
  ];
  const MET_WE = [
    { key: "Peratus pesakit baru warga emas mengikut populasi", row: 8,  type: "pct", color: "#0ea5e9", target: 10 },
    { key: "Bilangan pesakit baru warga emas",                   row: 9,  type: "cnt", color: "#10b981" },
    { key: "Peratus bilangan institusi dilawati di daerah",     row: 16, type: "pct", color: "#f59e0b", target: 100 },
    { key: "Peratus Warga Emas disaring (liputan)",             row: 22, type: "pct", color: "#8b5cf6", target: 75 },
    { key: "Peratus ≥60 tahun mendapat dentur ≤8 minggu (KPI 11)", row: 33, type: "pct", color: "#ef4444" },
    { key: "% ≥60 tahun mempunyai ≥ 20 batang gigi",            row: 39, type: "pct", color: "#a855f7", target: 30 },
  ];
  let RAW_WE=null, CH_WE=null;

  function buildDD9(){
    buildDD("dd9menu","dd9all","dd9none","dd9close", MET_WE.map(m=>m.key), MET_WE[0].key);
  }
  const chosen9 = () => chosen("dd9menu", MET_WE[0].key);

  function computeT9(arr,set){
    const labels=["", ...DIST_WE.map(d=>d.n), ""];
    const per=[];
    MET_WE.forEach(m=>{
      if(!set.has(m.key)) return;
      const s=[0];
      DIST_WE.forEach(d=>{
        s.push(m.type==="cnt" ? cellInt(arr, d.L+String(m.row)) : cellPct(arr, d.L+String(m.row)));
      });
      s.push(0);
      per.push({ key:m.key, type:m.type, color:m.color, target:m.target, data:s });
    });
    return { labels, per };
  }
  function straight(len,val){ return Array.from({length:len},()=>val); }

  function drawT9(data,canvas,mode){
    if(CH_WE) CH_WE.destroy();
    const ds=[];
    data.per.forEach(m=>{
      ds.push({
        label: m.key,
        data: m.data,
        borderColor: m.color,
        backgroundColor: "transparent",
        borderWidth: 3,
        tension: 0.45,
        fill: false,
        yAxisID: m.type==="cnt" ? "yR" : "yL",
      });
      if(m.target!=null && m.type!=="cnt"){
        ds.push({
          label: "Sasaran",
          data: straight(m.data.length, m.target),
          borderColor: "#475569",
          borderWidth: 2,
          borderDash: [4,4],
          pointRadius: 0,
          fill: false,
          yAxisID: "yL",
        });
      }
    });
    CH_WE = new Chart($(canvas).getContext("2d"),{
      type:"line",
      data:{ labels:data.labels, datasets:ds },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{
            mode:"index", intersect:false,
            filter:(i)=>!(i.dataIndex===0 || i.dataIndex===data.labels.length-1),
          },
        },
        scales:{
          x:{
            grid:{display:false},
            ticks:{
              autoSkip:false,
              maxRotation: mode==="main"?90:40,
              minRotation: mode==="main"?90:40,
              callback:(v,i)=> i===0||i===data.labels.length-1 ? "" : data.labels[i],
            },
          },
          yL:{ position:"left", beginAtZero:true, ticks:{ callback:(v)=>v+"%" } },
          yR:{ position:"right", beginAtZero:true, grid:{display:false}, ticks:{ callback:(v)=>nice(v) } },
        },
      }
    });
    try{
      const core = data.per.flatMap(m=>m.data.slice(1,-1));
      if(allZero(core)){
        const ctx=$(canvas).getContext("2d");
        ctx.font="12px Inter, system-ui"; ctx.fillStyle="#94a3b8";
        ctx.fillText("Tiada data untuk dipaparkan",12,22);
      }
    }catch(_e){}
    return CH_WE;
  }

  function refreshT9Tags(){
    const set = chosen9();
    const tags = $("dd9tags");
    const leg = $("t9legend");
    tags.innerHTML=""; leg.innerHTML="";
    Array.from(set).forEach(k=>{
      const m = MET_WE.find(x=>x.key===k);
      const c = m ? m.color : "#64748b";
      const s=document.createElement("span"); s.className="tag"; s.textContent=k; tags.appendChild(s);
      const el=document.createElement("span"); el.className="lg";
      const dot=document.createElement("span"); dot.className="dot"; dot.style.background=c;
      const tx=document.createElement("span"); tx.textContent=k; el.appendChild(dot); el.appendChild(tx);
      leg.appendChild(el);
    });
  }

  async function loadT9(){
    const err=$("t9err"); err.style.display="none";
    try{
      buildDD9();
      const csv = await fetchCSV(CSV_WE);
      RAW_WE = Papa.parse(csv,{header:false, skipEmptyLines:true}).data;
      refreshT9Tags();
      drawT9(computeT9(RAW_WE, chosen9()), "t9", "main");
      $("dd9btn").onclick=()=>$("dd9menu").classList.toggle("open");
      $("dd9menu").querySelectorAll("input").forEach(i=>{
        i.addEventListener("change", ()=>{
          refreshT9Tags();
          drawT9(computeT9(RAW_WE, chosen9()), "t9", "main");
        });
      });
      document.addEventListener("click",(e)=>{ const box=$("dd9"); if(box && !box.contains(e.target)) $("dd9menu").classList.remove("open");});
      $("t9time").textContent=new Date().toLocaleString();
    }catch(e){
      console.error(e);
      err.textContent="Gagal memuatkan CSV (Tile 9).";
      err.style.display="block";
    }
  }
  $("t9refresh").addEventListener("click", loadT9);
  $("t9expand").addEventListener("click", ()=>{
    if(!RAW_WE) return;
    openModal("Warga Emas");
    MCH = drawT9(computeT9(RAW_WE, chosen9()), "mcanvas", "modal");
  });
  loadT9();

  // ===== Redraw on resize (append WE) =====
  window.addEventListener("resize", function(){
    // keep your existing resize code for T1..T8
    if(RAW_WE) drawT9(computeT9(RAW_WE, chosen9()), "t9", "main");
  });
})();
