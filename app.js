/* ===== tiny helpers ===== */
const $ = (id) => document.getElementById(id);
const qs = (sel, el=document) => el.querySelector(sel);
const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

async function fetchCSV(url){
  const res = await fetch(url, {cache:"no-store"});
  if(!res.ok) throw new Error("CSV fetch failed");
  return await res.text();
}
function nice(n){ if(n==null || isNaN(n)) return "0"; return Number(n).toLocaleString(); }

/* sheet cell helpers */
function cellAt(arr, A1){
  // A1 like D8 -> col letter + row number
  const m = /^([A-Z]+)(\d+)$/.exec(A1);
  if(!m) return "";
  const col = m[1], row = parseInt(m[2],10)-1;
  // convert col letters to index: A=0, B=1...
  let ci = 0;
  for(let i=0;i<col.length;i++){ ci = ci*26 + (col.charCodeAt(i)-64); }
  ci -= 1;
  return (arr[row] && arr[row][ci]) ?? "";
}
const toPct = (v)=> {
  if(typeof v === "number") return v;
  if(!v) return 0;
  const s = String(v).replace(/[%\s]/g,"");
  const num = parseFloat(s);
  return isNaN(num)?0:num;
};
const toInt = (v)=>{
  if(typeof v === "number") return v;
  if(!v) return 0;
  const s = String(v).replace(/[^\d.-]/g,"");
  const num = parseInt(s,10);
  return isNaN(num)?0:num;
};

/* dropdown builder (icon-only trigger) */
function buildDropdown({menuId, items, defaultKey}){
  const menu = $(menuId);
  const body = qs(".menu-body", menu);
  body.innerHTML = "";
  items.forEach(k=>{
    const row = document.createElement("label");
    row.className = "menu-item";
    row.innerHTML = `<input type="checkbox" value="${k}"><span>${k}</span>`;
    body.appendChild(row);
  });
  // default selection (single)
  qsa("input[type=checkbox]", body).forEach(cb=>{
    cb.checked = (cb.value === defaultKey);
  });
}
function chosenSet(menuId){
  const body = qs(".menu-body", $(menuId));
  const set = new Set();
  qsa("input[type=checkbox]", body).forEach(cb=>{ if(cb.checked) set.add(cb.value); });
  return set;
}
function wireDropdown(boxId){
  const box = $(boxId);
  const btn = qs("button", box);
  const menu = qs(".menu", box);
  btn.onclick = ()=> menu.classList.toggle("open");
  qs(".menu-ft #"+boxId.replace("dd","dd")+"close", menu)?.addEventListener("click", ()=>menu.classList.remove("open"));
  document.addEventListener("click",(e)=>{ if(!box.contains(e.target)) menu.classList.remove("open"); });
}

/* modal */
let MCH = null;
function openModal(title){
  $("mtitle").textContent = title;
  $("modal").classList.add("show");
}
$("mclose").addEventListener("click",()=>{$("modal").classList.remove("show"); if(MCH){MCH.destroy(); MCH=null;}});
/* generic area-style dataset */
function area(lineColor, fillGradient, yAxis="y", width=3){ 
  return { borderColor: lineColor, backgroundColor: fillGradient, borderWidth: width, tension:.45, fill:true, yAxisID:yAxis };
}
function dashed(lineColor, yAxis="y"){ 
  return { borderColor: lineColor, borderWidth:2, borderDash:[5,5], pointRadius:0, fill:false, tension:0, yAxisID:yAxis };
}
function emptyGuard(values){
  return values.every(v=> (Array.isArray(v)?v:values).every(n=> (n||0)===0 ));
}

/* =========================================
   TILE 7 – YOUNG ADULT
   ========================================= */
const CSV_YA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=543945307&single=true&output=csv";
const DIST_LETTERS = [
  { n:"Kota Setar", L:"D"},{n:"Pendang",L:"E"},{n:"Kuala Muda",L:"F"},{n:"Sik",L:"G"},
  { n:"Kulim",L:"H"},{n:"Bandar Baru",L:"I"},{n:"Kubang Pasu",L:"J"},{n:"Pdg Terap",L:"K"},
  { n:"Baling",L:"L"},{n:"Yan",L:"M"},{n:"Langkawi",L:"N"},{n:"Kedah",L:"O"}
];
const YA_METRICS = [
  { key:"Peratus tidak perlu rawatan", row:8,  target:70, color:"#0ea5e9" },
  { key:"Peratus kes selesai (Orally Fit)", row:14, target:70, color:"#10b981" },
];

let RAW_YA=null, CH_YA=null;
function computeYA(arr, set){
  const labels=["",...DIST_LETTERS.map(d=>d.n),""];
  const series=[];
  YA_METRICS.forEach(m=>{
    if(!set.has(m.key)) return;
    const data=[0];
    DIST_LETTERS.forEach(d=> data.push( toPct(cellAt(arr, d.L+String(m.row))) ));
    data.push(0);
    series.push({label:m.key, data, color:m.color, target:m.target});
  });
  return {labels, series};
}
function drawYA(data, canvasId, mode){
  if(CH_YA) CH_YA.destroy();
  const ctx = $(canvasId).getContext("2d");
  const g1 = ctx.createLinearGradient(0,0,0,260); g1.addColorStop(0,"rgba(14,165,233,.35)"); g1.addColorStop(1,"rgba(14,165,233,.04)");
  const g2 = ctx.createLinearGradient(0,0,0,260); g2.addColorStop(0,"rgba(16,185,129,.35)"); g2.addColorStop(1,"rgba(16,185,129,.04)");
  const fills=[g1,g2];

  const datasets=[];
  data.series.forEach((s,i)=>{
    datasets.push({...area(s.color, fills[i%2], "yL"), label:s.label, data:s.data });
    if(s.target!=null){
      datasets.push({...dashed("#475569","yL"), label:`Sasaran ${s.label}`, data:new Array(s.data.length).fill(s.target)});
    }
  });

  CH_YA = new Chart(ctx,{
    type:"line",
    data:{labels:data.labels, datasets},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false},
        tooltip:{mode:"index",intersect:false, filter:(i)=>!(i.dataIndex===0||i.dataIndex===data.labels.length-1)}
      },
      scales:{
        x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:90,minRotation:90,callback:(v,i)=> (i===0||i===data.labels.length-1)?"":data.labels[i]}},
        yL:{position:"left",beginAtZero:true,ticks:{callback:(v)=>v+"%"}}
      }
    }
  });

  if(emptyGuard(datasets.flatMap(d=>d.data.slice?.(1,-1) ?? []))){
    ctx.font="12px Inter, system-ui"; ctx.fillStyle="#94a3b8"; ctx.fillText("Tiada data untuk dipaparkan",12,22);
  }
  return CH_YA;
}
function buildDD7(){
  buildDropdown({menuId:"dd7menu", items:YA_METRICS.map(m=>m.key), defaultKey:YA_METRICS[0].key});
  wireDropdown("dd7");
}
function refreshYA(){
  const sel = chosenSet("dd7menu");
  const tags = $("dd7tags"); tags.innerHTML="";
  sel.forEach(k=>{ const span=document.createElement("span"); span.className="tag"; span.textContent=k; tags.appendChild(span); });
  if(!RAW_YA){$("t7err").textContent=""; return;}
  drawYA(computeYA(RAW_YA, sel),"t7","main");
}
async function loadYA(){
  $("t7err").style.display="none";
  try{
    const csv = await fetchCSV(CSV_YA);
    RAW_YA = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
    $("t7time").textContent = new Date().toLocaleString();
    buildDD7(); refreshYA();
    qsa("#dd7menu input").forEach(i=> i.addEventListener("change",refreshYA));
  }catch(e){ console.error(e); $("t7err").textContent="Gagal memuatkan CSV (YA)."; $("t7err").style.display="block"; }
}
$("t7refresh").addEventListener("click", loadYA);
$("t7expand").addEventListener("click", ()=>{ if(!RAW_YA) return; openModal("Young Adult"); MCH = drawYA(computeYA(RAW_YA, chosenSet("dd7menu")),"mcanvas","modal");});

/* =========================================
   TILE 8 – BPE
   ========================================= */
const CSV_BPE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1983552555&single=true&output=csv";
const BPE_METRICS = [
  { key:"Peratus BPE screening", row:8,  color:"#0ea5e9" },
  { key:"Peratus BPE = 0",       row:13, color:"#8b5cf6" }
];
let RAW_BPE=null, CH_BPE=null;

function computeBPE(arr, set){
  const labels=["",...DIST_LETTERS.map(d=>d.n),""];
  const series=[];
  BPE_METRICS.forEach(m=>{
    if(!set.has(m.key)) return;
    const data=[0]; DIST_LETTERS.forEach(d=> data.push( toPct(cellAt(arr, d.L+String(m.row))) )); data.push(0);
    series.push({label:m.key, data, color:m.color});
  });
  return {labels, series};
}
function drawBPE(data, canvasId, mode){
  if(CH_BPE) CH_BPE.destroy();
  const ctx = $(canvasId).getContext("2d");
  const g1 = ctx.createLinearGradient(0,0,0,260); g1.addColorStop(0,"rgba(14,165,233,.35)"); g1.addColorStop(1,"rgba(14,165,233,.04)");
  const g2 = ctx.createLinearGradient(0,0,0,260); g2.addColorStop(0,"rgba(139,92,246,.35)"); g2.addColorStop(1,"rgba(139,92,246,.04)");
  const datasets = data.series.map((s,i)=> ({...area(s.color, i?g2:g1, "yL"), label:s.label, data:s.data}));

  CH_BPE = new Chart(ctx,{type:"line", data:{labels:data.labels, datasets},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},
      tooltip:{mode:"index",intersect:false, filter:(i)=>!(i.dataIndex===0||i.dataIndex===data.labels.length-1)}},
      scales:{x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:90,minRotation:90,callback:(v,i)=>(i===0||i===data.labels.length-1)?"":data.labels[i]}},
             yL:{position:"left",beginAtZero:true,ticks:{callback:(v)=>v+"%"}}}
  });
  if(emptyGuard(datasets.flatMap(d=>d.data.slice?.(1,-1) ?? []))){
    ctx.font="12px Inter, system-ui"; ctx.fillStyle="#94a3b8"; ctx.fillText("Tiada data untuk dipaparkan",12,22);
  }
  return CH_BPE;
}
function buildDD8(){
  buildDropdown({menuId:"dd8menu", items:BPE_METRICS.map(m=>m.key), defaultKey:BPE_METRICS[0].key});
  wireDropdown("dd8");
}
function refreshBPE(){
  const sel = chosenSet("dd8menu");
  const tags = $("dd8tags"); tags.innerHTML=""; sel.forEach(k=>{ const s=document.createElement("span"); s.className="tag"; s.textContent=k; tags.appendChild(s); });
  if(!RAW_BPE) return; drawBPE(computeBPE(RAW_BPE, sel),"t8","main");
}
async function loadBPE(){
  $("t8err").style.display="none";
  try{
    const csv = await fetchCSV(CSV_BPE);
    RAW_BPE = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
    $("t8time").textContent = new Date().toLocaleString();
    buildDD8(); refreshBPE();
    qsa("#dd8menu input").forEach(i=> i.addEventListener("change",refreshBPE));
  }catch(e){ console.error(e); $("t8err").textContent="Gagal memuatkan CSV (BPE)."; $("t8err").style.display="block"; }
}
$("t8refresh").addEventListener("click", loadBPE);
$("t8expand").addEventListener("click", ()=>{ if(!RAW_BPE) return; openModal("Basic Periodontal Examination"); MCH=drawBPE(computeBPE(RAW_BPE, chosenSet("dd8menu")),"mcanvas","modal");});

/* =========================================
   TILE 9 – WARGA EMAS
   ========================================= */
const CSV_WE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=480846724&single=true&output=csv";

const WE_METRICS = [
  { key:"Peratus pesakit baru warga emas mengikut populasi", row:8,  type:"pct", color:"#0ea5e9", target:10 },
  { key:"Peratus bilangan institusi dilawati di daerah",     row:16, type:"pct", color:"#10b981", target:100 },
  { key:"Peratus Warga Emas disaring",                      row:22, type:"pct", color:"#f59e0b", target:75 },
  { key:"% Warga Emas ≥60 thn dengan ≥20 batang gigi",     row:39, type:"pct", color:"#ef4444", target:30 },
];

let RAW_WE=null, CH_WE=null;
function computeWE(arr, set){
  const labels=["",...DIST_LETTERS.map(d=>d.n),""];
  const series=[];
  WE_METRICS.forEach(m=>{
    if(!set.has(m.key)) return;
    const data=[0]; DIST_LETTERS.forEach(d=> data.push( m.type==="pct"? toPct(cellAt(arr, d.L+String(m.row))) : toInt(cellAt(arr, d.L+String(m.row))) )); data.push(0);
    series.push({label:m.key, data, color:m.color, target:m.target, type:m.type});
  });
  return {labels, series};
}
function drawWE(data, canvasId, mode){
  if(CH_WE) CH_WE.destroy();
  const ctx = $(canvasId).getContext("2d");
  const gA = ctx.createLinearGradient(0,0,0,260); gA.addColorStop(0,"rgba(14,165,233,.35)"); gA.addColorStop(1,"rgba(14,165,233,.04)");
  const gB = ctx.createLinearGradient(0,0,0,260); gB.addColorStop(0,"rgba(16,185,129,.35)"); gB.addColorStop(1,"rgba(16,185,129,.04)");
  const gC = ctx.createLinearGradient(0,0,0,260); gC.addColorStop(0,"rgba(245,158,11,.35)"); gC.addColorStop(1,"rgba(245,158,11,.04)");
  const gD = ctx.createLinearGradient(0,0,0,260); gD.addColorStop(0,"rgba(239,68,68,.35)"); gD.addColorStop(1,"rgba(239,68,68,.04)");
  const fills=[gA,gB,gC,gD];

  const datasets=[];
  data.series.forEach((s,i)=>{
    datasets.push({...area(s.color, fills[i%4], s.type==="pct"?"yL":"yR"), label:s.label, data:s.data});
    if(s.target!=null && s.type==="pct"){
      datasets.push({...dashed("#475569","yL"), label:`Sasaran ${s.label}`, data:new Array(s.data.length).fill(s.target)});
    }
  });

  CH_WE = new Chart(ctx,{
    type:"line",
    data:{labels:data.labels, datasets},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false},
        tooltip:{mode:"index", intersect:false, filter:(i)=>!(i.dataIndex===0||i.dataIndex===data.labels.length-1)}},
      scales:{
        x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:90,minRotation:90,callback:(v,i)=>(i===0||i===data.labels.length-1)?"":data.labels[i]}},
        yL:{position:"left", beginAtZero:true, ticks:{callback:(v)=>v+"%"}},
        yR:{position:"right", beginAtZero:true, grid:{display:false}, ticks:{callback:(v)=>nice(v)}}
      }
    }
  });

  if(emptyGuard(datasets.flatMap(d=>d.data.slice?.(1,-1) ?? []))){
    ctx.font="12px Inter, system-ui"; ctx.fillStyle="#94a3b8"; ctx.fillText("Tiada data untuk dipaparkan",12,22);
  }
  return CH_WE;
}
function buildDD9(){
  buildDropdown({menuId:"dd9menu", items:WE_METRICS.map(m=>m.key), defaultKey:WE_METRICS[0].key});
  wireDropdown("dd9");
}
function refreshWE(){
  const sel = chosenSet("dd9menu");
  const tags = $("dd9tags"); tags.innerHTML=""; sel.forEach(k=>{ const s=document.createElement("span"); s.className="tag"; s.textContent=k; tags.appendChild(s); });
  if(!RAW_WE) return; drawWE(computeWE(RAW_WE, sel),"t9","main");
}
async function loadWE(){
  $("t9err").style.display="none";
  try{
    const csv = await fetchCSV(CSV_WE);
    RAW_WE = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
    $("t9time").textContent = new Date().toLocaleString();
    buildDD9(); refreshWE();
    qsa("#dd9menu input").forEach(i=> i.addEventListener("change",refreshWE));
  }catch(e){ console.error(e); $("t9err").textContent="Gagal memuatkan CSV (Warga Emas)."; $("t9err").style.display="block"; }
}
$("t9refresh").addEventListener("click", loadWE);
$("t9expand").addEventListener("click", ()=>{ if(!RAW_WE) return; openModal("Warga Emas"); MCH=drawWE(computeWE(RAW_WE, chosenSet("dd9menu")),"mcanvas","modal");});

/* =========================================
   SAFE placeholders for Tiles 1–6
   (won't break; show msg until wired)
   ========================================= */
function safeEmptyChart(canvasId,title){
  const ctx=$(canvasId).getContext("2d");
  const dummy = ["","Kota Setar","Pendang","Kuala Muda","Sik","Kulim","Bandar Baru","Kubang Pasu","Pdg Terap","Baling","Yan","Langkawi","Kedah",""];
  const data = new Array(dummy.length).fill(0); data[0]=0; data[data.length-1]=0;
  new Chart(ctx,{type:"line",data:{labels:dummy,datasets:[{label:title,data, borderColor:"#94a3b8",borderDash:[4,4],pointRadius:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:90,minRotation:90,callback:(v,i)=>(i===0||i===dummy.length-1)?"":dummy[i]}},y:{beginAtZero:true}}});
  ctx.font="12px Inter, system-ui"; ctx.fillStyle="#94a3b8"; ctx.fillText("Rangka siap. Tambah sumber CSV untuk paparan sebenar.",12,22);
}
function initSafeTiles(){
  ["t1","t2","t3","t4","t5","t6"].forEach((id,i)=>{ try{ safeEmptyChart(id, "Menunggu data"); $(id.replace("t","t")+"time").textContent=new Date().toLocaleString(); }catch(e){} });
}
["t1refresh","t2refresh","t3refresh","t4refresh","t5refresh","t6refresh"].forEach(id=>{
  const el=$(id); if(el) el.addEventListener("click", initSafeTiles);
});
["t1expand","t2expand","t3expand","t4expand","t5expand","t6expand"].forEach(id=>{
  const el=$(id); if(el) el.addEventListener("click", ()=>{ openModal("Paparan Besar"); MCH = safeEmptyChart("mcanvas","Menunggu data"); });
});

/* ===== boot ===== */
initSafeTiles();
loadYA();
loadBPE();
loadWE();

window.addEventListener("resize", ()=>{
  if(RAW_YA) drawYA(computeYA(RAW_YA, chosenSet("dd7menu")),"t7","main");
  if(RAW_BPE) drawBPE(computeBPE(RAW_BPE, chosenSet("dd8menu")),"t8","main");
  if(RAW_WE) drawWE(computeWE(RAW_WE, chosenSet("dd9menu")),"t9","main");
});
