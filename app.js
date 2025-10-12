/* ===== helpers ===== */
const $ = (id) => document.getElementById(id);
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

async function fetchCSV(url){
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("fetch csv");
  return r.text();
}
function nice(n){ return (n==null||isNaN(n)) ? "0" : Number(n).toLocaleString(); }

/* A1 cell helpers */
function a1Cell(arr, A1){
  const m = /^([A-Z]+)(\d+)$/.exec(A1);
  if (!m) return "";
  let col = 0;
  for (const ch of m[1]) col = col*26 + (ch.charCodeAt(0)-64);
  const r = parseInt(m[2],10)-1, c = col-1;
  return (arr[r] && arr[r][c]) ? arr[r][c] : "";
}
function valPct(v){
  if (typeof v === "number") return v;
  if (!v) return 0;
  const x = String(v).replace(/[%\s]/g,"");
  const n = parseFloat(x);
  return isNaN(n) ? 0 : n;
}
function valInt(v){
  if (typeof v === "number") return v;
  if (!v) return 0;
  const x = String(v).replace(/[^\d.-]/g,"");
  const n = parseInt(x,10);
  return isNaN(n) ? 0 : n;
}

/* dropdowns (icon-chip triggers) */
function buildDropdown(menuId, items, defaultKey){
  const menu = $(menuId);
  const body = qs(".menu-body", menu);
  body.innerHTML = "";
  items.forEach((k)=>{
    const row = document.createElement("label");
    row.className = "menu-item";
    row.innerHTML = '<input type="checkbox" value="'+k+'"><span>'+k+'</span>';
    body.appendChild(row);
  });
  qsa("input[type=checkbox]", body).forEach((cb)=>{ cb.checked = (cb.value===defaultKey); });
}
function chosen(menuId){
  const set = new Set();
  qsa("#"+menuId+" .menu-body input[type=checkbox]").forEach((cb)=>{
    if (cb.checked) set.add(cb.value);
  });
  if (set.size===0){
    const first = qs("#"+menuId+" .menu-body input[type=checkbox]");
    if (first){ first.checked = true; set.add(first.value); }
  }
  return set;
}
function wireDropdown(boxId){
  const box  = $(boxId);
  const btn  = qs("button.icon-chip, button.pill", box);
  const menu = qs(".menu", box);
  btn.addEventListener("click", ()=> menu.classList.toggle("open"));
  const closeBtn = qs(".menu-ft button:last-child", menu);
  closeBtn.addEventListener("click", ()=> menu.classList.remove("open"));
  const allBtn  = qs(".menu-ft button:nth-child(1)", menu);
  const noneBtn = qs(".menu-ft button:nth-child(2)", menu);
  if (allBtn)  allBtn.addEventListener("click", ()=> qsa(".menu-body input", menu).forEach((c)=>{ c.checked=true; }));
  if (noneBtn) noneBtn.addEventListener("click", ()=> qsa(".menu-body input", menu).forEach((c)=>{ c.checked=false; }));
  document.addEventListener("click", (e)=>{ if (!box.contains(e.target)) menu.classList.remove("open"); });
}

/* modal */
let MCH = null;
function openModal(title){ $("mtitle").textContent = title; $("modal").classList.add("show"); }
$("mclose").addEventListener("click", ()=>{
  $("modal").classList.remove("show");
  if (MCH){ MCH.destroy(); MCH=null; }
});

/* chart helpers */
function makeArea(color, fill, y, w){
  return { borderColor:color, backgroundColor:fill, borderWidth:w||3, tension:.45, fill:true, yAxisID:y||"y" };
}
function makeDash(color, y){
  return { borderColor:color, borderWidth:2, borderDash:[5,5], pointRadius:0, fill:false, tension:0, yAxisID:y||"y" };
}
function allZero(arr){
  return arr.every((v)=> (Array.isArray(v)?allZero(v): (Number(v)||0)===0));
}

/* shared districts */
const DIST = [
  {n:"Kota Setar",L:"D"},{n:"Pendang",L:"E"},{n:"Kuala Muda",L:"F"},{n:"Sik",L:"G"},
  {n:"Kulim",L:"H"},{n:"Bandar Baru",L:"I"},{n:"Kubang Pasu",L:"J"},{n:"Pdg Terap",L:"K"},
  {n:"Baling",L:"L"},{n:"Yan",L:"M"},{n:"Langkawi",L:"N"},{n:"Kedah",L:"O"}
];

/* =======================
   TILE 7 – Young Adult
   ======================= */
const CSV_YA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=543945307&single=true&output=csv";
const YA_MET = [
  {k:"Peratus tidak perlu rawatan", row:8,  target:70, color:"#0ea5e9"},
  {k:"Peratus kes selesai (Orally Fit)", row:14, target:70, color:"#10b981"}
];
let RAW_YA=null, CH_YA=null;

function computeYA(arr, set){
  const labels = [""].concat(DIST.map((d)=>d.n)).concat([""]);
  const series = [];
  YA_MET.forEach((m)=>{
    if (!set.has(m.k)) return;
    const data = [0];
    DIST.forEach((d)=> data.push( valPct(a1Cell(arr, d.L+String(m.row))) ));
    data.push(0);
    series.push({label:m.k, data:data, color:m.color, target:m.target});
  });
  return { labels:labels, series:series };
}
function drawYA(data, canvasId){
  if (CH_YA) CH_YA.destroy();
  const ctx = $(canvasId).getContext("2d");
  const g1 = ctx.createLinearGradient(0,0,0,260); g1.addColorStop(0,"rgba(14,165,233,.35)"); g1.addColorStop(1,"rgba(14,165,233,.04)");
  const g2 = ctx.createLinearGradient(0,0,0,260); g2.addColorStop(0,"rgba(16,185,129,.35)"); g2.addColorStop(1,"rgba(16,185,129,.04)");
  const datasets=[];
  data.series.forEach((s,i)=>{
    datasets.push( Object.assign(makeArea(s.color, i?g2:g1, "yL"), {label:s.label, data:s.data}) );
    if (s.target!=null){
      datasets.push( Object.assign(makeDash("#475569","yL"), {label:"Sasaran "+s.label, data:new Array(s.data.length).fill(s.target)}) );
    }
  });
  CH_YA = new Chart(ctx,{ type:"line", data:{ labels:data.labels, datasets:datasets }, options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false},
      tooltip:{ mode:"index", intersect:false, filter:(i)=>!(i.dataIndex===0||i.dataIndex===data.labels.length-1) } },
    scales:{
      x:{ grid:{display:false}, ticks:{ autoSkip:false, maxRotation:90, minRotation:90,
        callback:(v,i)=> (i===0||i===data.labels.length-1)?"":data.labels[i] } },
      yL:{ position:"left", beginAtZero:true, ticks:{ callback:(v)=>v+"%" } }
    }
  }});
  const flat = [];
  datasets.forEach((d)=>{ if(Array.isArray(d.data)) flat.push.apply(flat, d.data.slice(1,-1)); });
  if (allZero(flat)){ ctx.font="12px Inter"; ctx.fillStyle="#94a3b8"; ctx.fillText("Tiada data untuk dipaparkan",12,22); }
}
function buildDD7(){ buildDropdown("dd7menu", YA_MET.map((m)=>m.k), YA_MET[0].k); wireDropdown("dd7"); }
function refreshYA(){
  const s = chosen("dd7menu");
  const tags = $("dd7tags"); tags.innerHTML="";
  s.forEach((k)=>{ const t=document.createElement("span"); t.className="tag"; t.textContent=k; tags.appendChild(t); });
  if (RAW_YA) drawYA(computeYA(RAW_YA,s),"t7");
}
async function loadYA(){
  $("t7err").style.display="none";
  try{
    const csv = await fetchCSV(CSV_YA);
    RAW_YA = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
    $("t7time").textContent = new Date().toLocaleString();
    buildDD7(); refreshYA();
    qsa("#dd7menu input").forEach((i)=> i.addEventListener("change", refreshYA));
  }catch(e){
    console.error(e);
    $("t7err").textContent="Gagal memuatkan CSV (YA).";
    $("t7err").style.display="block";
  }
}
$("t7refresh").addEventListener("click", loadYA);
$("t7expand").addEventListener("click", ()=>{
  if (!RAW_YA) return;
  openModal("Young Adult");
  MCH = new Chart($("mcanvas").getContext("2d"), CH_YA.config);
});

/* =======================
   TILE 8 – BPE
   ======================= */
const CSV_BPE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1983552555&single=true&output=csv";
const BPE_MET = [
  {k:"Peratus BPE screening", row:8, color:"#0ea5e9"},
  {k:"Peratus BPE = 0",       row:13,color:"#8b5cf6"}
];
let RAW_BPE=null, CH_BPE=null;

function computeBPE(arr, set){
  const labels = [""].concat(DIST.map((d)=>d.n)).concat([""]);
  const series = [];
  BPE_MET.forEach((m)=>{
    if (!set.has(m.k)) return;
    const data=[0];
    DIST.forEach((d)=> data.push( valPct(a1Cell(arr, d.L+String(m.row))) ));
    data.push(0);
    series.push({label:m.k, data:data, color:m.color});
  });
  return {labels:labels, series:series};
}
function drawBPE(data, canvasId){
  if (CH_BPE) CH_BPE.destroy();
  const ctx = $(canvasId).getContext("2d");
  const g1 = ctx.createLinearGradient(0,0,0,260); g1.addColorStop(0,"rgba(14,165,233,.35)"); g1.addColorStop(1,"rgba(14,165,233,.04)");
  const g2 = ctx.createLinearGradient(0,0,0,260); g2.addColorStop(0,"rgba(139,92,246,.35)"); g2.addColorStop(1,"rgba(139,92,246,.04)");
  const datasets = data.series.map((s,i)=>{
    const fill = (i===0)?g1:g2;
    const cfg  = makeArea(s.color, fill, "yL");
    return Object.assign(cfg, {label:s.label, data:s.data});
  });
  CH_BPE = new Chart(ctx,{ type:"line", data:{ labels:data.labels, datasets:datasets }, options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false},
      tooltip:{ mode:"index", intersect:false, filter:(i)=>!(i.dataIndex===0||i.dataIndex===data.labels.length-1) } },
    scales:{
      x:{ grid:{display:false}, ticks:{ autoSkip:false, maxRotation:90, minRotation:90,
        callback:(v,i)=> (i===0||i===data.labels.length-1)?"":data.labels[i] } },
      yL:{ position:"left", beginAtZero:true, ticks:{ callback:(v)=>v+"%" } }
    }
  }});
  const flat=[];
  datasets.forEach((d)=>{ if(Array.isArray(d.data)) flat.push.apply(flat, d.data.slice(1,-1)); });
  if (allZero(flat)){ ctx.font="12px Inter"; ctx.fillStyle="#94a3b8"; ctx.fillText("Tiada data untuk dipaparkan",12,22); }
}
function buildDD8(){ buildDropdown("dd8menu", BPE_MET.map((m)=>m.k), BPE_MET[0].k); wireDropdown("dd8"); }
function refreshBPE(){
  const s = chosen("dd8menu");
  const tags = $("dd8tags"); tags.innerHTML="";
  s.forEach((k)=>{ const t=document.createElement("span"); t.className="tag"; t.textContent=k; tags.appendChild(t); });
  if (RAW_BPE) drawBPE(computeBPE(RAW_BPE,s),"t8");
}
async function loadBPE(){
  $("t8err").style.display="none";
  try{
    const csv = await fetchCSV(CSV_BPE);
    RAW_BPE = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
    $("t8time").textContent = new Date().toLocaleString();
    buildDD8(); refreshBPE();
    qsa("#dd8menu input").forEach((i)=> i.addEventListener("change", refreshBPE));
  }catch(e){
    console.error(e);
    $("t8err").textContent="Gagal memuatkan CSV (BPE).";
    $("t8err").style.display="block";
  }
}
$("t8refresh").addEventListener("click", loadBPE);
$("t8expand").addEventListener("click", ()=>{
  if (!RAW_BPE) return;
  openModal("Basic Periodontal Examination");
  MCH = new Chart($("mcanvas").getContext("2d"), CH_BPE.config);
});

/* =======================
   TILE 9 – Warga Emas
   ======================= */
const CSV_WE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=480846724&single=true&output=csv";
const WE_MET = [
  {k:"Peratus pesakit baru warga emas mengikut populasi", row:8,  type:"pct", color:"#0ea5e9", target:10},
  {k:"Peratus bilangan institusi dilawati di daerah",     row:16, type:"pct", color:"#10b981", target:100},
  {k:"Peratus Warga Emas disaring",                      row:22, type:"pct", color:"#f59e0b", target:75},
  {k:"% Warga Emas ≥60 thn dengan ≥20 batang gigi",      row:39, type:"pct", color:"#ef4444", target:30}
];
let RAW_WE=null, CH_WE=null;

function computeWE(arr, set){
  const labels = [""].concat(DIST.map((d)=>d.n)).concat([""]);
  const series = [];
  WE_MET.forEach((m)=>{
    if (!set.has(m.k)) return;
    const data=[0];
    DIST.forEach((d)=>{
      const A1 = d.L+String(m.row);
      data.push( m.type==="pct" ? valPct(a1Cell(arr, A1)) : valInt(a1Cell(arr, A1)) );
    });
    data.push(0);
    series.push({label:m.k, data:data, color:m.color, target:m.target, type:m.type});
  });
  return {labels:labels, series:series};
}
function drawWE(data, canvasId){
  if (CH_WE) CH_WE.destroy();
  const ctx = $(canvasId).getContext("2d");
  const gA = ctx.createLinearGradient(0,0,0,260); gA.addColorStop(0,"rgba(14,165,233,.35)"); gA.addColorStop(1,"rgba(14,165,233,.04)");
  const gB = ctx.createLinearGradient(0,0,0,260); gB.addColorStop(0,"rgba(16,185,129,.35)"); gB.addColorStop(1,"rgba(16,185,129,.04)");
  const gC = ctx.createLinearGradient(0,0,0,260); gC.addColorStop(0,"rgba(245,158,11,.35)"); gC.addColorStop(1,"rgba(245,158,11,.04)");
  const gD = ctx.createLinearGradient(0,0,0,260); gD.addColorStop(0,"rgba(239,68,68,.35)"); gD.addColorStop(1,"rgba(239,68,68,.04)");
  const fills=[gA,gB,gC,gD];

  const datasets=[];
  data.series.forEach((s,i)=>{
    const cfg = makeArea(s.color, fills[i%4], s.type==="pct"?"yL":"yR");
    datasets.push( Object.assign(cfg, {label:s.label, data:s.data}) );
    if (s.target!=null && s.type==="pct"){
      datasets.push( Object.assign(makeDash("#475569","yL"), {label:"Sasaran "+s.label, data:new Array(s.data.length).fill(s.target)}) );
    }
  });

  CH_WE = new Chart(ctx,{ type:"line", data:{ labels:data.labels, datasets:datasets }, options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false},
      tooltip:{ mode:"index", intersect:false, filter:(i)=>!(i.dataIndex===0||i.dataIndex===data.labels.length-1) } },
    scales:{
      x:{ grid:{display:false}, ticks:{ autoSkip:false, maxRotation:90, minRotation:90,
        callback:(v,i)=> (i===0||i===data.labels.length-1)?"":data.labels[i] } },
      yL:{ position:"left", beginAtZero:true, ticks:{ callback:(v)=>v+"%" } },
      yR:{ position:"right", beginAtZero:true, grid:{display:false}, ticks:{ callback:(v)=>nice(v) } }
    }
  }});
  const flat=[];
  datasets.forEach((d)=>{ if(Array.isArray(d.data)) flat.push.apply(flat, d.data.slice(1,-1)); });
  if (allZero(flat)){ ctx.font="12px Inter"; ctx.fillStyle="#94a3b8"; ctx.fillText("Tiada data untuk dipaparkan",12,22); }
}
function buildDD9(){ buildDropdown("dd9menu", WE_MET.map((m)=>m.k), WE_MET[0].k); wireDropdown("dd9"); }
function refreshWE(){
  const s = chosen("dd9menu");
  const tags = $("dd9tags"); tags.innerHTML="";
  s.forEach((k)=>{ const t=document.createElement("span"); t.className="tag"; t.textContent=k; tags.appendChild(t); });
  if (RAW_WE) drawWE(computeWE(RAW_WE,s),"t9");
}
async function loadWE(){
  $("t9err").style.display="none";
  try{
    const csv = await fetchCSV(CSV_WE);
    RAW_WE = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
    $("t9time").textContent = new Date().toLocaleString();
    buildDD9(); refreshWE();
    qsa("#dd9menu input").forEach((i)=> i.addEventListener("change", refreshWE));
  }catch(e){
    console.error(e);
    $("t9err").textContent="Gagal memuatkan CSV (Warga Emas).";
    $("t9err").style.display="block";
  }
}
$("t9refresh").addEventListener("click", loadWE);
$("t9expand").addEventListener("click", ()=>{
  if (!RAW_WE) return;
  openModal("Warga Emas");
  MCH = new Chart($("mcanvas").getContext("2d"), CH_WE.config);
});

/* ===== placeholders for Tiles 1–6 so nothing breaks ===== */
function safeChart(id){
  const ctx=$(id).getContext("2d");
  const labels=["","Kota Setar","Pendang","Kuala Muda","Sik","Kulim","Bandar Baru","Kubang Pasu","Pdg Terap","Baling","Yan","Langkawi","Kedah",""];
  const data=new Array(labels.length).fill(0); data[0]=0; data[data.length-1]=0;
  new Chart(ctx,{type:"line",data:{labels:labels,datasets:[{label:"Menunggu data",data:data,borderDash:[4,4],borderColor:"#94a3b8",pointRadius:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:90,minRotation:90,callback:(v,i)=>(i===0||i===labels.length-1)?"":labels[i]}},y:{beginAtZero:true}}});
}
function initSafe(){
  ["t1","t2","t3","t4","t5","t6"].forEach((t)=>{
    try{
      safeChart(t);
      const timeId = t + "time";
      if ($(timeId)) $(timeId).textContent = new Date().toLocaleString();
    }catch(e){}
  });
}
["t1refresh","t2refresh","t3refresh","t4refresh","t5refresh","t6refresh"].forEach((id)=>{
  const el=$(id); if(el) el.addEventListener("click", initSafe);
});
["t1expand","t2expand","t3expand","t4expand","t5expand","t6expand"].forEach((id)=>{
  const el=$(id); if(el) el.addEventListener("click", ()=>{ openModal("Paparan Besar"); safeChart("mcanvas"); });
});

/* ===== boot ===== */
initSafe();
loadYA();
loadBPE();
loadWE();

window.addEventListener("resize", ()=>{
  if (RAW_YA)  drawYA (computeYA (RAW_YA, chosen("dd7menu")), "t7");
  if (RAW_BPE) drawBPE(computeBPE(RAW_BPE, chosen("dd8menu")), "t8");
  if (RAW_WE)  drawWE (computeWE (RAW_WE, chosen("dd9menu")), "t9");
});
