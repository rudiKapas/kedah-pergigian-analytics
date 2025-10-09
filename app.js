(function () {
  "use strict";

  /* ----------------- utilities ----------------- */
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  function colIndexFromLetter(L){let n=0;for(let i=0;i<L.length;i++) n=n*26+(L.charCodeAt(i)-64);return n-1;}
  function niceNum(n){if(n==null)return"—";return n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(1)+"k":Number(n).toLocaleString();}
  function cleanInt(x){if(x==null)return 0;let s=String(x).replace(/\u00A0/g,"").trim();s=s.replace(/[%\s]/g,"").replace(/,/g,"");const v=Number(s);return isNaN(v)?0:v;}
  function cell(arr,addr){const m=/^([A-Z]+)(\d+)$/.exec(addr);if(!m)return 0;const col=m[1],row=parseInt(m[2],10);const r=row-1,c=colIndexFromLetter(col);return cleanInt((arr[r]||[])[c]);}
  const $ = (id)=>document.getElementById(id);

  async function fetchCSV(url){
    const attempts = [
      {u:url},
      {u:"https://r.jina.ai/http/" + url.replace(/^https?:\/\//,"")},
      {u:"https://r.jina.ai/http/https://" + url.replace(/^https?:\/\//,"")}
    ];
    for (const a of attempts){
      try{
        const r=await fetch(a.u,{mode:"cors",cache:"no-store"});
        if(!r.ok) throw 0;
        const t=await r.text();
        if(!t || t.length<10) throw 0;
        return t;
      }catch(e){ await sleep(120); }
    }
    throw new Error("CSV fetch failed");
  }

  /* ----------------- TILE 1 ----------------- */
  const CSV1="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1057141723&single=true&output=csv";
  const MAP=[{name:"Kota Setar",col:"C"},{name:"Pendang",col:"D"},{name:"Kuala Muda",col:"E"},{name:"Sik",col:"F"},{name:"Kulim",col:"G"},{name:"Bandar Baru",col:"H"},{name:"Kubang Pasu",col:"I"},{name:"Padang Terap",col:"J"},{name:"Baling",col:"K"},{name:"Yan",col:"L"},{name:"Langkawi",col:"M"},{name:"Kedah",col:"N"}];

  function cleanPop(x){if(x==null)return null;const s=String(x).replace(/\u00A0/g,"").replace(/[\s,]/g,"").trim();const v=Number(s);return isNaN(v)?null:v;}
  function cleanPct(x){if(x==null)return null;let s=String(x).replace(/\u00A0/g,"").trim();const had=s.includes("%");s=s.replace(/[%\s]/g,"").replace(/,/g,".");const p=s.split(".");if(p.length>2)s=p[0]+"."+p.slice(1).join("");let v=Number(s);if(isNaN(v))return null;if(!had&&v>0&&v<=1)v=v*100;return +v.toFixed(2);}

  let RAW1=null, CHART1=null;
  function padEnds(labels,series){return {labels:["",...labels,""],series:[0,...series.map(v=>v??0),0]}};

  function draw1(rows, ctxId, mode){
    const L = rows.map(r=>r.name);
    const A = rows.map(r=>r.access ?? 0);
    const P = rows.map(r=>r.population ?? 0);
    const pA = padEnds(L,A), pP = padEnds(L,P), X = pA.labels;

    const ctx=$(ctxId).getContext("2d");
    const g1=ctx.createLinearGradient(0,0,0,260); g1.addColorStop(0,"rgba(245,158,11,0.45)"); g1.addColorStop(1,"rgba(245,158,11,0.02)");
    const g2=ctx.createLinearGradient(0,0,0,260); g2.addColorStop(0,"rgba(99,102,241,0.45)"); g2.addColorStop(1,"rgba(99,102,241,0.02)");

    if(CHART1 && ctxId==="infogChart") CHART1.destroy();
    const chart = new Chart(ctx,{
      type:"line",
      data:{labels:X,datasets:[
        {label:"% Menerima Perkhidmatan",data:pA.series,borderColor:"#f59e0b",backgroundColor:g1,borderWidth:3,tension:.45,fill:true,spanGaps:true,
          pointRadius:c=> (c.dataIndex===0||c.dataIndex===X.length-1)?0:3, pointHoverRadius:5, yAxisID:"y1"},
        {label:"Anggaran Penduduk",data:pP.series,borderColor:"#6366f1",backgroundColor:g2,borderWidth:3,tension:.45,fill:true,spanGaps:true,
          pointRadius:c=> (c.dataIndex===0||c.dataIndex===X.length-1)?0:3, pointHoverRadius:5, yAxisID:"y2"},
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:10}},
        plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,
          filter:i=> !(i.dataIndex===0||i.dataIndex===X.length-1),
          callbacks:{label:c=> c.datasetIndex===0 ? ` Akses: ${c.parsed.y||0}%` : ` Populasi: ${niceNum(c.parsed.y)}`}}},
        scales:{
          x:{grid:{display:false},ticks:{
              autoSkip:false,maxRotation:mode==="main"?90:40,minRotation:mode==="main"?90:40,
              callback:(v,i)=> (i===0||i===X.length-1) ? "" : X[i]}},
          y1:{position:"left",beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:v=>v+"%"}},
          y2:{position:"right",beginAtZero:true,grid:{display:false},ticks:{callback:v=>niceNum(v)}}
        }
      }
    });
    if(ctxId==="infogChart") CHART1=chart;
    return chart;
  }
  function compute1(){
    if(!RAW1) return [];
    const popR=RAW1[9]||[], accR=RAW1[10]||[];
    return MAP.map(m=>{
      const i=colIndexFromLetter(m.col);
      let access = cleanPct(accR[i]);
      if(access===null && String(accR[i]||"").trim()==="0") access=0;
      return {name:m.name, population:cleanPop(popR[i]), access};
    });
  }
  async function load1(){
    const err=$("err"); err.style.display="none"; err.textContent="";
    try{
      const csv = await fetchCSV(CSV1);
      RAW1 = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;
      draw1(compute1(),"infogChart","main");
      $("lastUpdated").textContent=new Date().toLocaleString();
    }catch(e){
      console.error("Tile 1 CSV error:", e);
      err.style.display='block';
      err.textContent="Gagal memuatkan data CSV (Tile 1).";
    }
  }
  $("refreshBtn").addEventListener("click",load1);
  load1();

  /* ---------- Generic dropdown builder (used by tile 2 & 3) ---------- */
  function buildDropdown(menuId, footerBtnAllId, footerBtnNoneId, footerBtnCloseId, items, defaultKey){
    const menu=$(menuId); if(!menu) return;
    if(menu.dataset.built==="1") return; // already built
    const footer=menu.querySelector(".dd-footer");
    const frag=document.createDocumentFragment();
    items.forEach((label,idx)=>{
      const el=document.createElement("label");
      el.className="dd-row";
      const checked = (defaultKey ? (label===defaultKey) : idx===0) ? "checked":"";
      el.innerHTML=`<input type="checkbox" data-key="${label}" ${checked}> ${label}`;
      frag.appendChild(el);
    });
    menu.insertBefore(frag,footer);
    menu.dataset.built="1";

    $(footerBtnAllId)?.addEventListener("click",()=>{ menu.querySelectorAll("input[type=checkbox]").forEach(i=>i.checked=true); });
    $(footerBtnNoneId)?.addEventListener("click",()=>{ menu.querySelectorAll("input[type=checkbox]").forEach(i=>i.checked=false); });
    $(footerBtnCloseId)?.addEventListener("click",()=>{ menu.classList.remove("open"); });
  }
  function getCheckedSet(menuId, fallback){
    const menu=$(menuId); const s=new Set();
    if(menu){
      menu.querySelectorAll("input[type=checkbox]").forEach(i=>{ if(i.checked) s.add(i.getAttribute("data-key")); });
    }
    if(s.size===0 && fallback) s.add(fallback);
    return s;
  }

  /* ----------------- TILE 2 (Primer by age groups) ----------------- */
  const CSV2="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1808391684&single=true&output=csv";
  const DIST2=[{name:"Kota Setar",col:"D"},{name:"Pendang",col:"E"},{name:"Kuala Muda",col:"F"},{name:"Sik",col:"G"},{name:"Kulim",col:"H"},{name:"Bandar Baru",col:"I"},{name:"Kubang Pasu",col:"J"},{name:"Padang Terap",col:"K"},{name:"Baling",col:"L"},{name:"Yan",col:"M"},{name:"Langkawi",col:"N"},{name:"Kedah",col:"O"}];
  const CATS2=[{key:"<5 tahun",b:[8,10],u:[9,11]},{key:"5-6 tahun",b:[12],u:[13]},{key:"7-12 tahun",b:[14,16],u:[15,17]},{key:"13-17 tahun",b:[18,20],u:[19,21]},{key:"18-59 tahun",b:[22,24,26,28],u:[23,25,27,29]},{key:"<60 tahun",b:[30],u:[31]},{key:"Ibu mengandung",b:[34],u:[35]},{key:"OKU",b:[36],u:[37]},{key:"Bukan warganegara",b:[38],u:[39]}];
  const CAT_COLOR2={"<5 tahun":"#0ea5e9","5-6 tahun":"#4f46e5","7-12 tahun":"#10b981","13-17 tahun":"#ef4444","18-59 tahun":"#8b5cf6","<60 tahun":"#14b8a6","Ibu mengandung":"#f59e0b","OKU":"#22c55e","Bukan warganegara":"#a855f7"};

  let RAW2=null, CHART2=null;

  function selectedKeys2(){ return getCheckedSet("ddMenu2","<5 tahun"); }
  function updateTagsAndLegend2(){
    const tags=$("selectedTags2"); const legend=$("legend2"); if(!tags||!legend) return;
    tags.innerHTML=""; legend.innerHTML="";
    Array.from(selectedKeys2()).forEach(k=>{
      const t=document.createElement("span"); t.className="tag"; t.textContent=k; tags.appendChild(t);
      const item=document.createElement("div"); item.style.display="flex"; item.style.alignItems="center"; item.style.gap="8px";
      const dot=document.createElement("span"); dot.className="dot"; dot.style.background=CAT_COLOR2[k]||"#64748b";
      const txt=document.createElement("span"); txt.textContent=k; item.append(dot,txt); legend.appendChild(item);
    });
  }
  function sumCells(arr,letter,rows){return rows.reduce((t,r)=>t+cell(arr,letter+String(r)),0);}
  function computePerCat2(arr,keys){
    const labels=["",...DIST2.map(d=>d.name),""];
    const perCat=[];
    CATS2.forEach(cat=>{
      if(!keys.has(cat.key)) return;
      const baru = [0], ulangan=[0];
      DIST2.forEach(d=>{
        baru.push(sumCells(arr,d.col,cat.b));
        ulangan.push(sumCells(arr,d.col,cat.u));
      });
      baru.push(0); ulangan.push(0);
      perCat.push({key:cat.key,baru,ulangan});
    });
    return {labels,perCat};
  }
  function draw2(data,showB,showU, ctxId, mode){
    const ctx=$(ctxId).getContext("2d");
    if(CHART2 && ctxId==="chartPrimer") CHART2.destroy();
    const sets=[];
    data.perCat.forEach(cat=>{
      const color=CAT_COLOR2[cat.key]||"#64748b";
      if(showB) sets.push({label:cat.key+" • Baru",data:cat.baru,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[],pointRadius:c=> (c.dataIndex===0||c.dataIndex===data.labels.length-1)?0:3,pointHoverRadius:5});
      if(showU) sets.push({label:cat.key+" • Ulangan",data:cat.ulangan,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[6,4],pointRadius:c=> (c.dataIndex===0||c.dataIndex===data.labels.length-1)?0:3,pointHoverRadius:5});
    });
    const chart=new Chart(ctx,{type:"line",data:{labels:data.labels,datasets:sets},options:{
      responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:10}},
      plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,filter:i=> !(i.dataIndex===0||i.dataIndex===data.labels.length-1)}},
      scales:{
        x:{grid:{display:false},ticks:{
            autoSkip:false,maxRotation:mode==="main"?90:40,minRotation:mode==="main"?90:40,
            callback:(v,i)=> (i===0||i===data.labels.length-1) ? "" : data.labels[i]
        }},
        y:{beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:v=>Number(v).toLocaleString()}}
      }
    }});
    if(ctxId==="chartPrimer") CHART2=chart;
    return chart;
  }

  async function load2(){
    const err=$("err2"); err.style.display="none"; err.textContent="";
    try{
      // build dropdown safely (generic)
      buildDropdown("ddMenu2","btnAll2","btnNone2","btnClose2", CATS2.map(c=>c.key), "<5 tahun");
      updateTagsAndLegend2();

      const csv = await fetchCSV(CSV2);
      RAW2 = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;

      const data = computePerCat2(RAW2,selectedKeys2());
      draw2(data,$("chkBaru2").checked,$("chkUlangan2").checked,"chartPrimer","main");

      $("ddBtn2").onclick=()=> $("ddMenu2").classList.toggle("open");
      $("ddMenu2").querySelectorAll("input[type=checkbox]").forEach(i=>{
        i.addEventListener("change",()=>{
          updateTagsAndLegend2(); const d=computePerCat2(RAW2,selectedKeys2());
          draw2(d,$("chkBaru2").checked,$("chkUlangan2").checked,"chartPrimer","main");
        });
      });
      document.addEventListener("click",(ev)=>{const box=$("ddBox2"); if(box && !box.contains(ev.target)) $("ddMenu2").classList.remove("open");});
      $("chkBaru2").addEventListener("change",()=>{const d=computePerCat2(RAW2,selectedKeys2()); draw2(d,$("chkBaru2").checked,$("chkUlangan2").checked,"chartPrimer","main");});
      $("chkUlangan2").addEventListener("change",()=>{const d=computePerCat2(RAW2,selectedKeys2()); draw2(d,$("chkBaru2").checked,$("chkUlangan2").checked,"chartPrimer","main");});

      $("lastUpdated2").textContent=new Date().toLocaleString();
    }catch(e){
      console.error("Tile 2 CSV error:", e);
      err.style.display='block';
      err.textContent="Gagal memuatkan CSV (Tile 2). Sahkan 'Publish to web' aktif & cuba Kemas Kini.";
    }
  }
  $("refreshBtn2").addEventListener("click",load2);
  load2();

  /* ----------------- TILE 3 (OUTREACH sheet) ----------------- */
  const CSV3="https://docs.google.com/spreadsheets/d/e/2PACX-1vSS9NxgDwQDoJrQZJS4apFq-p5oyK3B0WAnFTlCY2WGcvsMzNBGIZjilIez1AXWvAIZgKltIxLEPTFT/pub?gid=1032207232&single=true&output=csv";
  const DIST3=[
    {name:"Kota Setar",col:"D"},{name:"Pendang",col:"E"},{name:"Kuala Muda",col:"F"},{name:"Sik",col:"G"},
    {name:"Kulim",col:"H"},{name:"Bandar Baharu",col:"I"},{name:"Kubang Pasu",col:"J"},{name:"Padang Terap",col:"K"},
    {name:"Baling",col:"L"},{name:"Yan",col:"M"},{name:"Langkawi",col:"N"},{name:"Kedah",col:"O"}
  ];
  const SERVICES = [
    {key:"Primer", baru:6, ulangan:7, color:"#0ea5e9"},
    {key:"Outreach", baru:10, ulangan:11, color:"#10b981"},
    {key:"UTC", baru:14, ulangan:15, color:"#f59e0b"},
    {key:"RTC", baru:18, ulangan:19, color:"#ef4444"},
    {key:"TASTAD", baru:22, ulangan:23, color:"#8b5cf6"},
    {key:"Sekolah", baru:26, ulangan:27, color:"#14b8a6"}
  ];

  let RAW3=null, CHART3=null;

  function selectedKeys3(){ return getCheckedSet("ddMenu3","Primer"); }
  function updateTagsAndLegend3(){
    const tags=$("selectedTags3"); const legend=$("legend3"); if(!tags||!legend) return;
    tags.innerHTML=""; legend.innerHTML="";
    Array.from(selectedKeys3()).forEach(k=>{
      const svc=SERVICES.find(x=>x.key===k); const color=svc?.color || "#64748b";
      const t=document.createElement("span"); t.className="tag"; t.textContent=k; tags.appendChild(t);
      const item=document.createElement("div"); item.style.display="flex"; item.style.alignItems="center"; item.style.gap="8px";
      const dot=document.createElement("span"); dot.className="dot"; dot.style.background=color;
      const txt=document.createElement("span"); txt.textContent=k; item.append(dot,txt); legend.appendChild(item);
    });
  }
  function computeOutreach(arr,keys){
    const labels=["",...DIST3.map(d=>d.name),""];
    const perSvc=[];
    SERVICES.forEach(svc=>{
      if(!keys.has(svc.key)) return;
      const baru=[0], ulangan=[0];
      DIST3.forEach(d=>{
        baru.push(cell(arr, d.col + String(svc.baru)));
        ulangan.push(cell(arr, d.col + String(svc.ulangan)));
      });
      baru.push(0); ulangan.push(0);
      perSvc.push({key:svc.key,color:svc.color,baru,ulangan});
    });
    return {labels,perSvc};
  }

  function draw3(data,showB,showU, ctxId, mode){
    const ctx=$(ctxId).getContext("2d");
    if(CHART3 && ctxId==="chartOutreach") CHART3.destroy();

    const sets=[];
    data.perSvc.forEach(s=>{
      const color=s.color||"#64748b";
      if(showB) sets.push({label:s.key+" • Baru",data:s.baru,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[],pointRadius:c=> (c.dataIndex===0||c.dataIndex===data.labels.length-1)?0:3,pointHoverRadius:5});
      if(showU) sets.push({label:s.key+" • Ulangan",data:s.ulangan,borderColor:color,backgroundColor:"transparent",borderWidth:3,tension:.45,fill:false,borderDash:[6,4],pointRadius:c=> (c.dataIndex===0||c.dataIndex===data.labels.length-1)?0:3,pointHoverRadius:5});
    });

    const chart=new Chart(ctx,{type:"line",data:{labels:data.labels,datasets:sets},options:{
      responsive:true,maintainAspectRatio:false,layout:{padding:{bottom:10}},
      plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,filter:i=> !(i.dataIndex===0||i.dataIndex===data.labels.length-1)}},
      scales:{
        x:{grid:{display:false},ticks:{
            autoSkip:false,maxRotation:mode==="main"?90:40,minRotation:mode==="main"?90:40,
            callback:(v,i)=> (i===0||i===data.labels.length-1) ? "" : data.labels[i]
        }},
        y:{beginAtZero:true,grid:{color:"rgba(15,23,42,.06)"},ticks:{callback:v=>Number(v).toLocaleString()}}
      }
    }});
    if(ctxId==="chartOutreach") CHART3=chart;
    return chart;
  }

  async function load3(){
    const err=$("err3"); err.style.display="none"; err.textContent="";
    try{
      buildDropdown("ddMenu3","btnAll3","btnNone3","btnClose3", SERVICES.map(s=>s.key), "Primer");
      updateTagsAndLegend3();

      const csv = await fetchCSV(CSV3);
      RAW3 = Papa.parse(csv,{header:false,skipEmptyLines:true}).data;

      const data = computeOutreach(RAW3,selectedKeys3());
      draw3(data,$("chkBaru3").checked,$("chkUlangan3").checked,"chartOutreach","main");

      $("ddBtn3").onclick=()=> $("ddMenu3").classList.toggle("open");
      $("ddMenu3").querySelectorAll("input[type=checkbox]").forEach(i=>{
        i.addEventListener("change",()=>{
          updateTagsAndLegend3(); const d=computeOutreach(RAW3,selectedKeys3());
          draw3(d,$("chkBaru3").checked,$("chkUlangan3").checked,"chartOutreach","main");
        });
      });
      document.addEventListener("click",(ev)=>{const box=$("ddBox3"); if(box && !box.contains(ev.target)) $("ddMenu3").classList.remove("open");});
      $("chkBaru3").addEventListener("change",()=>{const d=computeOutreach(RAW3,selectedKeys3()); draw3(d,$("chkBaru3").checked,$("chkUlangan3").checked,"chartOutreach","main");});
      $("chkUlangan3").addEventListener("change",()=>{const d=computeOutreach(RAW3,selectedKeys3()); draw3(d,$("chkBaru3").checked,$("chkUlangan3").checked,"chartOutreach","main");});

      $("lastUpdated3").textContent=new Date().toLocaleString();
    }catch(e){
      console.error("Tile 3 CSV error:", e);
      err.style.display='block';
      err.textContent="Gagal memuatkan CSV (Tile 3). Sahkan 'Publish to web' aktif & cuba Kemas Kini.";
    }
  }
  $("refreshBtn3").addEventListener("click",load3);
  load3();

  /* ----------------- Modal ----------------- */
  const modal=$("modal");
  const modalTitle=$("modalTitle");
  const modalClose=$("modalClose");
  let MODAL_CHART=null;

  function openModal(title){modalTitle.textContent=title;modal.classList.add("open");}
  function closeModal(){if(MODAL_CHART){MODAL_CHART.destroy();MODAL_CHART=null;}modal.classList.remove("open");}
  modalClose.addEventListener("click",closeModal);
  modal.addEventListener("click",e=>{if(e.target===modal)closeModal();});

  $("zoom1").addEventListener("click",()=>{
    openModal("Akses Kepada Perkhidmatan Kesihatan Pergigian");
    if(!RAW1) return;
    MODAL_CHART=draw1(compute1(),"modalChart","modal");
  });
  $("zoom2").addEventListener("click",()=>{
    openModal("Jumlah Kedatangan Baru & Ulangan Mengikut Kumpulan");
    if(!RAW2) return;
    const d=computePerCat2(RAW2,selectedKeys2());
    MODAL_CHART=draw2(d,$("chkBaru2").checked,$("chkUlangan2").checked,"modalChart","modal");
  });
  $("zoom3").addEventListener("click",()=>{
    openModal("Jumlah Kedatangan Pesakit Outreach Baru & Ulangan Mengikut Kumpulan");
    if(!RAW3) return;
    const d=computeOutreach(RAW3,selectedKeys3());
    MODAL_CHART=draw3(d,$("chkBaru3").checked,$("chkUlangan3").checked,"modalChart","modal");
  });

  // Re-render on resize for crisp labels
  window.addEventListener("resize",()=>{
    if(RAW1){draw1(compute1(),"infogChart","main");}
    if(RAW2){const d=computePerCat2(RAW2,selectedKeys2()); draw2(d,$("chkBaru2").checked,$("chkUlangan2").checked,"chartPrimer","main");}
    if(RAW3){const d=computeOutreach(RAW3,selectedKeys3()); draw3(d,$("chkBaru3").checked,$("chkUlangan3").checked,"chartOutreach","main");}
  });

}());
