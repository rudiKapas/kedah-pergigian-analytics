(function(){
  "use strict";
  const $ = (id)=>document.getElementById(id);
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  function colIndexFromLetter(L){let n=0;for(let i=0;i<L.length;i++) n=n*26+(L.charCodeAt(i)-64);return n-1;}
  function cleanInt(x){if(x==null)return 0;let s=String(x).replace(/\u00A0/g,"").trim().replace(/[%\s]/g,"").replace(/,/g,"");const v=Number(s);return isNaN(v)?0:v;}
  function niceNum(n){if(n==null)return"—";return n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(1)+"k":Number(n).toLocaleString();}
  function cell(arr,addr){const m=/^([A-Z]+)(\d+)$/.exec(addr);if(!m)return 0;const r=parseInt(m[2],10)-1,c=colIndexFromLetter(m[1]);return cleanInt((arr[r]||[])[c]);}
  async function fetchCSV(url){
    const tries=[url,"https://r.jina.ai/http/"+url.replace(/^https?:\/\//,""),"https://r.jina.ai/http/https://"+url.replace(/^https?:\/\//,"")];
    for(const u of tries){try{const r=await fetch(u,{mode:"cors",cache:"no-store"});if(!r.ok) throw 0;const t=await r.text();if(t&&t.length>10) return t;}catch{await sleep(120)}}
    throw new Error("CSV fetch failed");
  }

  /* ---------------- TILE 1 ---------------- */
  const CSV1="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1057141723&single=true&output=csv";
  const MAP=[{name:"Kota Setar",col:"C"},{name:"Pendang",col:"D"},{name:"Kuala Muda",col:"E"},{name:"Sik",col:"F"},{name:"Kulim",col:"G"},{name:"Bandar Baru",col:"H"},{name:"Kubang Pasu",col:"I"},{name:"Padang Terap",col:"J"},{name:"Baling",col:"K"},{name:"Yan",col:"L"},{name:"Langkawi",col:"M"},{name:"Kedah",col:"N"}];
  let RAW1=null,CH1=null;
  function cleanPop(x){if(x==null)return null;const s=String(x).replace(/\u00A0/g,"").replace(/[\s,]/g,"").trim();const v=Number(s);return isNaN(v)?null:v;}
  function cleanPct(x){if(x==null)return null;let s=String(x).replace(/\u00A0/g,"").trim();const had=s.includes("%");s=s.replace(/[%\s]/g,"").replace(/,/g,".");const p=s.split(".");if(p.length>2)s=p[0]+"."+p.slice(1).join("");let v=Number(s);if(isNaN(v))return null;if(!had&&v>0&&v<=1)v=v*100;return +v.toFixed(2);}
  function padEnds(labels,series){return {labels:["",...labels,""],series:[0,...series.map(v=>v??0),0]}};
  function draw1(rows, cid, mode){
    const L=rows.map(r=>r.name), A=rows.map(r=>r.access??0), P=rows.map(r=>r.population??0);
    const pA=padEnds(L,A), pP=padEnds(L,P), X=pA.labels;
    const ctx=$(cid).getContext("2d");
    const g1=ctx.createLinearGradient(0,0,0,260); g1.addColorStop(0,"rgba(245,158,11,.45)"); g1.addColorStop(1,"rgba(245,158,11,.02)");
    const g2=ctx.createLinearGradient(0,0,0,260); g2.addColorStop(0,"rgba(99,102,241,.45)"); g2.addColorStop(1,"rgba(99,102,241,.02)");
    if(CH1 && cid==="infogChart") CH1.destroy();
    const chart=new Chart(ctx,{type:"line",data:{labels:X,datasets:[
      {label:"% Menerima Perkhidmatan",data:pA.series,borderColor:"#f59e0b",backgroundColor:g1,borderWidth:3,tension:.45,fill:true,spanGaps:true,pointRadius:c=>(c.dataIndex===0||c.dataIndex===X.length-1)?0:3,yAxisID:"y1"},
      {label:"Anggaran Penduduk",data:pP.series,borderColor:"#6366f1",backgroundColor:g2,borderWidth:3,tension:.45,fill:true,spanGaps:true,pointRadius:c=>(c.dataIndex===0||c.dataIndex===X.length-1)?0:3,yAxisID:"y2"}]},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:10}},
        plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,filter:i=>!(i.dataIndex===0||i.dataIndex===X.length-1),
          callbacks:{label:c=>c.datasetIndex===0?` Akses: ${c.parsed.y||0}%`:` Populasi: ${niceNum(c.parsed.y)}`}}},
        scales:{x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:mode==="main"?90:40,minRotation:mode==="main"?90:40,callback:(v,i)=> (i===0||i===X.length-1)?"":X[i]}},
                y1:{position:"left",beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:v=>v+"%"}},
                y2:{position:"right",beginAtZero:true,grid:{display:false},ticks:{callback:v=>niceNum(v)}}}});
    if(cid==="infogChart") CH1=chart; return chart;
  }
  async function load1(){
    const err=$("err"); err.style.display="none"; err.textContent="";
    try{ const csv=await fetchCSV(CSV1); RAW1=Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
      const rows=MAP.map(m=>{const i=colIndexFromLetter(m.col); const pop=cleanPop((RAW1[9]||[])[i]); let acc=cleanPct((RAW1[10]||[])[i]); if(acc===null && String((RAW1[10]||[])[i]||"").trim()==="0") acc=0; return {name:m.name,population:pop,access:acc};});
      draw1(rows,"infogChart","main"); $("lastUpdated").textContent=new Date().toLocaleString();
    }catch(e){ console.error("Tile 1 CSV error:",e); err.style.display='block'; err.textContent="Gagal memuatkan data CSV (Tile 1)."; }
  }
  $("refreshBtn").addEventListener("click",load1); load1();

  /* -------- generic dropdown helpers -------- */
  function buildDropdown(menuId, btnAllId, btnNoneId, btnCloseId, items, defaultKey){
    const menu=$(menuId); if(!menu) return;
    if(menu.dataset.built==="1") return;
    const footer=menu.querySelector(".dd-footer");
    const frag=document.createDocumentFragment();
    items.forEach((label,idx)=>{
      const el=document.createElement("label"); el.className="dd-row";
      const checked=(defaultKey?label===defaultKey:idx===0)?"checked":"";
      el.innerHTML=`<input type="checkbox" data-key="${label}" ${checked}> ${label}`; frag.appendChild(el);
    });
    menu.insertBefore(frag,footer); menu.dataset.built="1";
    $(btnAllId)?.addEventListener("click",()=>menu.querySelectorAll("input[type=checkbox]").forEach(i=>i.checked=true));
    $(btnNoneId)?.addEventListener("click",()=>menu.querySelectorAll("input[type=checkbox]").forEach(i=>i.checked=false));
    $(btnCloseId)?.addEventListener("click",()=>menu.classList.remove("open"));
  }
  function getChecked(menuId,fallback){
    const s=new Set(); const menu=$(menuId);
    if(menu) menu.querySelectorAll("input[type=checkbox]").forEach(i=>{ if(i.checked) s.add(i.getAttribute("data-key")); });
    if(s.size===0 && fallback) s.add(fallback); return s;
  }

  /* ---------------- TILE 2 ---------------- */
  const CSV2="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1808391684&single=true&output=csv";
  const DIST2=[{name:"Kota Setar",col:"D"},{name:"Pendang",col:"E"},{name:"Kuala Muda",col:"F"},{name:"Sik",col:"G"},{name:"Kulim",col:"H"},{name:"Bandar Baru",col:"I"},{name:"Kubang Pasu",col:"J"},{name:"Padang Terap",col:"K"},{name:"Baling",col:"L"},{name:"Yan",col:"M"},{name:"Langkawi",col:"N"},{name:"Kedah",col:"O"}];
  const CATS2=[{key:"<5 tahun",b:[8,10],u:[9,11]},{key:"5-6 tahun",b:[12],u:[13]},{key:"7-12 tahun",b:[14,16],u:[15,17]},{key:"13-17 tahun",b:[18,20],u:[19,21]},{key:"18-59 tahun",b:[22,24,26,28],u:[23,25,27,29]},{key:"<60 tahun",b:[30],u:[31]},{key:"Ibu mengandung",b:[34],u:[35]},{key:"OKU",b:[36],u:[37]},{key:"Bukan warganegara",b:[38],u:[39]}];
  const CAT_COLOR2={"<5 tahun":"#0ea5e9","5-6 tahun":"#4f46e5","7-12 tahun":"#10b981","13-17 tahun":"#ef4444","18-59 tahun":"#8b5cf6","<60 tahun":"#14b8a6","Ibu mengandung":"#f59e0b","OKU":"#22c55e","Bukan warganegara":"#a855f7"};
  let RAW2=null,CH2=null;
  function selected2(){return getChecked("ddMenu2","<5 tahun");}
  function tagsLegend2(){const tags=$("selectedTags2"),leg=$("legend2"); if(!tags||!leg) return; tags.innerHTML=""; leg.innerHTML=""; Array.from(selected2()).forEach(k=>{const t=document.createElement("span"); t.className="tag"; t.textContent=k; tags.appendChild(t); const it=document.createElement("div"); it.style.display="flex"; it.style.alignItems="center"; it.style.gap="8px"; const dot=document.createElement("span"); dot.className="dot"; dot.style.background=CAT_COLOR2[k]||"#64748b"; const s=document.createElement("span"); s.textContent=k; it.append(dot,s); leg.appendChild(it);});}
  function sumCells(arr,letter,rows){return rows.reduce((t,r)=>t+cell(arr,letter+String(r)),0);}
  function compute2(arr,keys){const labels=["",...DIST2.map(d=>d.name),""], per=[]; CATS2.forEach(c=>{if(!keys.has(c.key)) return; const b=[0],u=[0]; DIST2.forEach(d=>{b.push(sumCells(arr,d.col,c.b)); u.push(sumCells(arr,d.col,c.u));}); b.push(0); u.push(0); per.push({key:c.key,baru:b,ulangan:u});}); return {labels,per};}
  function draw2(data,showB,showU,cid,mode){const ctx=$(cid).getContext("2d"); if(CH2&&cid==="chartPrimer") CH2.destroy(); const sets=[]; data.per.forEach(c=>{const color=CAT_COLOR2[c.key]||"#64748b"; if(showB) sets.push({label:c.key+" • Baru",data:c.baru,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[],pointRadius:f=> (f.dataIndex===0||f.dataIndex===data.labels.length-1)?0:3}); if(showU) sets.push({label:c.key+" • Ulangan",data:c.ulangan,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[6,4],pointRadius:f=> (f.dataIndex===0||f.dataIndex===data.labels.length-1)?0:3});}); const chart=new Chart(ctx,{type:"line",data:{labels:data.labels,datasets:sets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,filter:i=>!(i.dataIndex===0||i.dataIndex===data.labels.length-1)}},scales:{x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:mode==="main"?90:40,minRotation:mode==="main"?90:40,callback:(v,i)=> (i===0||i===data.labels.length-1)?"":data.labels[i]}},y:{beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:v=>Number(v).toLocaleString()}}}}); if(cid==="chartPrimer") CH2=chart; return chart;}
  async function load2(){
    const err=$("err2"); err.style.display="none"; err.textContent="";
    try{
      buildDropdown("ddMenu2","btnAll2","btnNone2","btnClose2", CATS2.map(c=>c.key), "<5 tahun");
      tagsLegend2();
      const csv=await fetchCSV(CSV2); RAW2=Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
      const d=compute2(RAW2,selected2()); draw2(d,$("chkBaru2").checked,$("chkUlangan2").checked,"chartPrimer","main");
      $("ddBtn2").onclick=()=>$("ddMenu2").classList.toggle("open");
      $("ddMenu2").querySelectorAll("input[type=checkbox]").forEach(i=>i.addEventListener("change",()=>{tagsLegend2(); const d2=compute2(RAW2,selected2()); draw2(d2,$("chkBaru2").checked,$("chkUlangan2").checked,"chartPrimer","main");}));
      document.addEventListener("click",(e)=>{const box=$("ddBox2"); if(box && !box.contains(e.target)) $("ddMenu2").classList.remove("open");});
      $("chkBaru2").addEventListener("change",()=>{const d2=compute2(RAW2,selected2()); draw2(d2,$("chkBaru2").checked,$("chkUlangan2").checked,"chartPrimer","main");});
      $("chkUlangan2").addEventListener("change",()=>{const d2=compute2(RAW2,selected2()); draw2(d2,$("chkBaru2").checked,$("chkUlangan2").checked,"chartPrimer","main");});
      $("lastUpdated2").textContent=new Date().toLocaleString();
    }catch(e){ console.error("Tile 2 CSV error:",e); err.style.display='block'; err.textContent="Gagal memuatkan CSV (Tile 2)."; }
  }
  $("refreshBtn2").addEventListener("click",load2); load2();

  /* ---------------- TILE 3 (OUTREACH) ---------------- */
  const CSV3="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1032207232&single=true&output=csv";
  const DIST3=[...DIST2]; // same districts/columns letters mapping as Tile 2
  const SERVICES=[{key:"Primer",baru:6,ulangan:7,color:"#0ea5e9"},{key:"Outreach",baru:10,ulangan:11,color:"#10b981"},{key:"UTC",baru:14,ulangan:15,color:"#f59e0b"},{key:"RTC",baru:18,ulangan:19,color:"#ef4444"},{key:"TASTAD",baru:22,ulangan:23,color:"#8b5cf6"},{key:"Sekolah",baru:26,ulangan:27,color:"#14b8a6"}];
  let RAW3=null,CH3=null;
  function selected3(){return getChecked("ddMenu3","Primer");}
  function tagsLegend3(){const tags=$("selectedTags3"),leg=$("legend3"); if(!tags||!leg) return; tags.innerHTML=""; leg.innerHTML=""; Array.from(selected3()).forEach(k=>{const svc=SERVICES.find(x=>x.key===k); const color=svc?.color||"#64748b"; const t=document.createElement("span"); t.className="tag"; t.textContent=k; tags.appendChild(t); const it=document.createElement("div"); it.style.display="flex"; it.style.alignItems="center"; it.style.gap="8px"; const dot=document.createElement("span"); dot.className="dot"; dot.style.background=color; const s=document.createElement("span"); s.textContent=k; it.append(dot,s); leg.appendChild(it);});}
  function compute3(arr,keys){const labels=["",...DIST3.map(d=>d.name),""], per=[]; SERVICES.forEach(s=>{if(!keys.has(s.key)) return; const b=[0],u=[0]; DIST3.forEach(d=>{b.push(cell(arr,d.col+String(s.baru))); u.push(cell(arr,d.col+String(s.ulangan)));}); b.push(0); u.push(0); per.push({key:s.key,color:s.color,baru:b,ulangan:u});}); return {labels,per};}
  function draw3(data,showB,showU,cid,mode){const ctx=$(cid).getContext("2d"); if(CH3&&cid==="chartOutreach") CH3.destroy(); const sets=[]; data.per.forEach(s=>{const color=s.color||"#64748b"; if(showB) sets.push({label:s.key+" • Baru",data:s.baru,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false}); if(showU) sets.push({label:s.key+" • Ulangan",data:s.ulangan,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[6,4]});}); const chart=new Chart(ctx,{type:"line",data:{labels:data.labels,datasets:sets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,filter:i=>!(i.dataIndex===0||i.dataIndex===data.labels.length-1)}},scales:{x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:mode==="main"?90:40,minRotation:mode==="main"?90:40,callback:(v,i)=> (i===0||i===data.labels.length-1)?"":data.labels[i]}},y:{beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:v=>Number(v).toLocaleString()}}}}); if(cid==="chartOutreach") CH3=chart; return chart;}
  async function load3(){
    const err=$("err3"); err.style.display="none"; err.textContent="";
    try{
      buildDropdown("ddMenu3","btnAll3","btnNone3","btnClose3", SERVICES.map(s=>s.key), "Primer");
      tagsLegend3();
      const csv=await fetchCSV(CSV3); RAW3=Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
      const d=compute3(RAW3,selected3()); draw3(d,$("chkBaru3").checked,$("chkUlangan3").checked,"chartOutreach","main");
      $("ddBtn3").onclick=()=>$("ddMenu3").classList.toggle("open");
      $("ddMenu3").querySelectorAll("input[type=checkbox]").forEach(i=>i.addEventListener("change",()=>{tagsLegend3(); const d2=compute3(RAW3,selected3()); draw3(d2,$("chkBaru3").checked,$("chkUlangan3").checked,"chartOutreach","main");}));
      document.addEventListener("click",(e)=>{const box=$("ddBox3"); if(box && !box.contains(e.target)) $("ddMenu3").classList.remove("open");});
      $("chkBaru3").addEventListener("change",()=>{const d2=compute3(RAW3,selected3()); draw3(d2,$("chkBaru3").checked,$("chkUlangan3").checked,"chartOutreach","main");});
      $("chkUlangan3").addEventListener("change",()=>{const d2=compute3(RAW3,selected3()); draw3(d2,$("chkBaru3").checked,$("chkUlangan3").checked,"chartOutreach","main");});
      $("lastUpdated3").textContent=new Date().toLocaleString();
    }catch(e){ console.error("Tile 3 CSV error:",e); err.style.display='block'; err.textContent="Gagal memuatkan CSV (Tile 3)."; }
  }
  $("refreshBtn3").addEventListener("click",load3); load3();

  /* ---------------- TILE 4 (TODDLERS) ---------------- */
  const CSV4="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1851801564&single=true&output=csv";
  const DIST4=[
    {name:"Kota Setar",col:"D"},{name:"Pendang",col:"E"},{name:"Kuala Muda",col:"F"},{name:"Sik",col:"G"},
    {name:"Kulim",col:"H"},{name:"Bandar Baru",col:"I"},{name:"Kubang Pasu",col:"J"},{name:"Padang Terap",col:"K"},
    {name:"Baling",col:"L"},{name:"Yan",col:"M"},{name:"Langkawi",col:"N"},{name:"Kedah",col:"O"}
  ];
  // metrics from your spec: row numbers + type (pct or count)
  const TODD_METRICS=[
    {key:"% TASKA dilawati", row:12, type:"pct", color:"#0ea5e9"},
    {key:"% Liputan Toddler", row:17, type:"pct", color:"#10b981"},
    {key:"% 'Lift the Lip'", row:22, type:"pct", color:"#f59e0b"},
    {key:"% Maintaining Orally Fit", row:28, type:"pct", color:"#8b5cf6"},
    {key:"% Sapuan Fluoride Varnish", row:32, type:"pct", color:"#ef4444"},
    {key:"Bil. Ibubapa diberi 'AG'", row:33, type:"count", color:"#22c55e"}
  ];
  let RAW4=null,CH4=null;
  function selected4(){return getChecked("ddMenu4","% TASKA dilawati");}
  function tagsLegend4(){const tags=$("selectedTags4"),leg=$("legend4"); if(!tags||!leg) return; tags.innerHTML=""; leg.innerHTML=""; Array.from(selected4()).forEach(k=>{const m=TODD_METRICS.find(x=>x.key===k); const color=m?.color||"#64748b"; const t=document.createElement("span"); t.className="tag"; t.textContent=k; tags.appendChild(t); const it=document.createElement("div"); it.style.display="flex"; it.style.alignItems="center"; it.style.gap="8px"; const dot=document.createElement("span"); dot.className="dot"; dot.style.background=color; const s=document.createElement("span"); s.textContent=k; it.append(dot,s); leg.appendChild(it);});}
  function compute4(arr,keys){
    const labels=["",...DIST4.map(d=>d.name),""], per=[];
    TODD_METRICS.forEach(m=>{
      if(!keys.has(m.key)) return;
      const series=[0];
      DIST4.forEach(d=>{ series.push(cell(arr, d.col + String(m.row))); });
      series.push(0);
      per.push({key:m.key,type:m.type,color:m.color,data:series});
    });
    return {labels,per};
  }
  function draw4(data,cid,mode){
    const ctx=$(cid).getContext("2d");
    if(CH4 && cid==="chartToddlers") CH4.destroy();
    const sets=[];
    data.per.forEach(m=>{
      const ds={label:m.key,data:m.data,borderColor:m.color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false};
      ds.yAxisID = m.type==="count" ? "yR" : "yL";
      if(m.key.includes("Lift")) ds.borderDash=[6,4]; // small visual variation
      sets.push(ds);
    });
    const chart=new Chart(ctx,{type:"line",data:{labels:data.labels,datasets:sets},options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,filter:i=>!(i.dataIndex===0||i.dataIndex===data.labels.length-1)}},
      scales:{
        x:{grid:{display:false},ticks:{autoSkip:false,maxRotation:mode==="main"?90:40,minRotation:mode==="main"?90:40,callback:(v,i)=> (i===0||i===data.labels.length-1)?"":data.labels[i]}},
        yL:{position:"left",beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:v=>v+"%"}},
        yR:{position:"right",beginAtZero:true,grid:{display:false},ticks:{callback:v=>niceNum(v)}}
      }
    }});
    if(cid==="chartToddlers") CH4=chart;
    return chart;
  }
  async function load4(){
    const err=$("err4"); err.style.display="none"; err.textContent="";
    try{
      buildDropdown("ddMenu4","btnAll4","btnNone4","btnClose4", TODD_METRICS.map(m=>m.key), "% TASKA dilawati");
      tagsLegend4();
      const csv=await fetchCSV(CSV4); RAW4=Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
      const d=compute4(RAW4,selected4()); draw4(d,"chartToddlers","main");
      $("ddBtn4").onclick=()=>$("ddMenu4").classList.toggle("open");
      $("ddMenu4").querySelectorAll("input[type=checkbox]").forEach(i=>i.addEventListener("change",()=>{tagsLegend4(); const d2=compute4(RAW4,selected4()); draw4(d2,"chartToddlers","main");}));
      document.addEventListener("click",(e)=>{const box=$("ddBox4"); if(box && !box.contains(e.target)) $("ddMenu4").classList.remove("open");});
      $("lastUpdated4").textContent=new Date().toLocaleString();
    }catch(e){ console.error("Tile 4 CSV error:",e); err.style.display='block'; err.textContent="Gagal memuatkan CSV (Tile 4)."; }
  }
  $("refreshBtn4").addEventListener("click",load4); load4();

  /* ---------------- Modal (all tiles) ---------------- */
  const modal=$("modal"), modalTitle=$("modalTitle");
  let MCH=null;
  function openModal(t){modalTitle.textContent=t; modal.classList.add("open");}
  function closeModal(){ if(MCH){MCH.destroy();MCH=null;} modal.classList.remove("open"); }
  $("modalClose").addEventListener("click",closeModal);
  modal.addEventListener("click",(e)=>{ if(e.target===modal) closeModal(); });

  $("zoom1").addEventListener("click",()=>{ if(!RAW1) return; openModal("Akses Kepada Perkhidmatan Kesihatan Pergigian"); MCH=draw1(MAP.map(m=>{const i=colIndexFromLetter(m.col); return {name:m.name,population:cleanPop((RAW1[9]||[])[i]),access:cleanPct((RAW1[10]||[])[i])||0};}),"modalChart","modal"); });
  $("zoom2").addEventListener("click",()=>{ if(!RAW2) return; openModal("Kedatangan Baru & Ulangan"); const d=compute2(RAW2,selected2()); MCH=draw2(d,true,true,"modalChart","modal"); });
  $("zoom3").addEventListener("click",()=>{ if(!RAW3) return; openModal("Kedatangan Pesakit Outreach"); const d=compute3(RAW3,selected3()); MCH=draw3(d,true,true,"modalChart","modal"); });
  $("zoom4").addEventListener("click",()=>{ if(!RAW4) return; openModal("PENCAPAIAN PROGRAM TODDLER"); const d=compute4(RAW4,selected4()); MCH=draw4(d,"modalChart","modal"); });

  window.addEventListener("resize",()=>{ 
    if(RAW1){const rows=MAP.map(m=>{const i=colIndexFromLetter(m.col); return {name:m.name,population:cleanPop((RAW1[9]||[])[i]),access:cleanPct((RAW1[10]||[])[i])||0};}); draw1(rows,"infogChart","main");}
    if(RAW2){const d=compute2(RAW2,selected2()); draw2(d,true,true,"chartPrimer","main");}
    if(RAW3){const d=compute3(RAW3,selected3()); draw3(d,true,true,"chartOutreach","main");}
    if(RAW4){const d=compute4(RAW4,selected4()); draw4(d,"chartToddlers","main");}
  });
})();
