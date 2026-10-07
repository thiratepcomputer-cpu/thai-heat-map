import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const GEO_URL="https://raw.githubusercontent.com/chingchai/OpenGISData-Thailand/master/provinces.geojson";
const WEATHER_URL="https://api.open-meteo.com/v1/forecast";

const state={geo:null,features:[],data:new Map(),selected:null};

const $=id=>document.getElementById(id);
function prop(f,...keys){for(const k of keys)if(f.properties?.[k]!=null)return f.properties[k];return ""}

function heatIndexC(c,r){
  const T=c*9/5+32;
  if(T<80 || r<40) return 0.5*(T+61+((T-68)*1.2)+(r*.094))*5/9-17.7777778;
  const F=-42.379+2.04901523*T+10.14333127*r-.22475541*T*r-.00683783*T*T-.05481717*r*r+.00122874*T*T*r+.00085282*T*r*r-.00000199*T*T*r*r;
  return (F-32)*5/9;
}
function classify(h){
 if(h<27)return ["ปกติ","green","ความร้อนอยู่ในระดับค่อนข้างปกติ"];
 if(h<32)return ["เริ่มร้อน","yellow","ควรดื่มน้ำและพักจากแดดเป็นระยะ"];
 if(h<41)return ["ร้อนจัด","orange","ควรลดกิจกรรมกลางแจ้งและเฝ้าระวังอาการจากความร้อน"];
 return ["อันตราย","red","ควรหลีกเลี่ยงความร้อนและกิจกรรมหนักกลางแจ้ง"];
}
function airClass(t){
 if(t>=40)return ["ร้อนจัด","red"];
 if(t>=35)return ["ร้อน","orange"];
 return ["ต่ำกว่าเกณฑ์ร้อน","green"];
}
function centroid(f){return d3.geoCentroid(f)}

function show(f){
 const name=prop(f,"pro_th","NAME_1","name_th","name");
 state.selected=f;
 $("province").value=name;
 const d=state.data.get(name);
 if(!d){$("local").innerHTML='<p class="small">กำลังดึงข้อมูลอากาศของจังหวัดนี้…</p>';return;}
 const h=heatIndexC(d.temp,d.rh), [label,cls,msg]=classify(h), [air,airCls]=airClass(d.temp);
 $("local").innerHTML=`<p><b>อุณหภูมิ:</b> ${d.temp.toFixed(1)} °C<br><b>ความชื้น:</b> ${Math.round(d.rh)}%<br><b>เกณฑ์อากาศร้อน:</b> <span class="badge ${airCls}">${air}</span><br><span class="small">ข้อมูลเวลา ${d.time || "ล่าสุด"} (${d.timezone || "Asia/Bangkok"})</span></p>`;
 $("hi").textContent=(h||d.temp).toFixed(1)+" °C";
 $("level").textContent=label;$("level").className="badge "+cls;$("advice").textContent=msg;
}

function draw(){
 const el=$("map"), w=el.clientWidth,h=el.clientHeight;
 el.innerHTML="";
 const svg=d3.select(el).append("svg").attr("width","100%").attr("height","100%").attr("viewBox",`0 0 ${w} ${h}`);
 const g=svg.append("g");
 const projection=d3.geoMercator().fitExtent([[12,12],[w-12,h-12]],state.geo);
 const path=d3.geoPath(projection);
 g.selectAll("path").data(state.features).join("path")
  .attr("d",path)
  .attr("stroke","#fff").attr("stroke-width",.8)
  .attr("fill",f=>{
    const n=prop(f,"pro_th","NAME_1","name_th","name"),d=state.data.get(n);
    if(!d)return "#dfe5ef";
    const [_,cls]=classify(heatIndexC(d.temp,d.rh));
    return {green:"#65c98b",yellow:"#f2d65c",orange:"#f49b45",red:"#e45a5a"}[cls];
  })
  .style("cursor","pointer")
  .on("click",(e,f)=>show(f))
  .append("title").text(f=>prop(f,"pro_th","NAME_1","name_th","name"));

 g.append("g").selectAll("text").data(state.features).join("text")
  .attr("x",f=>path.centroid(f)[0]).attr("y",f=>path.centroid(f)[1])
  .attr("text-anchor","middle").attr("font-size","8px").attr("fill","#273043")
  .text(f=>{const n=prop(f,"pro_th","NAME_1","name_th","name");return state.data.has(n)?n:"";});
}

async function loadWeather(){
  $("status").textContent="กำลังอัปเดตข้อมูลอากาศทุกจังหวัด…";
  $("refresh").disabled=true;
  $("refresh").textContent="⏳ กำลังอัปเดต…";

  try{
    // ขอพิกัดของทั้ง 77 จังหวัด แล้วส่งเป็น request เดียว
    const coords=state.features.map(f=>d3.geoCentroid(f));
    const lat=coords.map(x=>x[1].toFixed(5)).join(",");
    const lon=coords.map(x=>x[0].toFixed(5)).join(",");

    // current + hourly ช่วยให้เลือกค่าล่าสุดที่มีเวลาแน่นอนได้
    // cache-busting ช่วยลดปัญหา browser/proxy เก็บคำขอเดิม
    const url=`${WEATHER_URL}?latitude=${lat}&longitude=${lon}`+
      `&current=temperature_2m,relative_humidity_2m`+
      `&hourly=temperature_2m,relative_humidity_2m`+
      `&forecast_days=1&timezone=Asia%2FBangkok`+
      `&models=best_match&_=${Date.now()}`;

    const r=await fetch(url,{cache:"no-store"});
    if(!r.ok) throw new Error("Weather API HTTP "+r.status);
    const j=await r.json();
    const rows=Array.isArray(j)?j:[j];

    state.data.clear();
    state.features.forEach((f,i)=>{
      const name=prop(f,"pro_th","NAME_1","name_th","name");
      const d=rows[i];
      if(!d?.current) return;
      const temp=Number(d.current.temperature_2m);
      const rh=Number(d.current.relative_humidity_2m);
      if(Number.isFinite(temp)&&Number.isFinite(rh)){
        state.data.set(name,{
          temp,rh,
          time:d.current.time || "",
          timezone:d.timezone_abbreviation || "Asia/Bangkok"
        });
      }
    });

    const now=new Date();
    const stamp=now.toLocaleString("th-TH",{dateStyle:"short",timeStyle:"medium"});
    $("status").textContent=`อัปเดตสำเร็จ ${state.data.size} จังหวัด • ตรวจสอบล่าสุด ${stamp}`;
    draw();
    if(state.selected) show(state.selected);
  }catch(e){
    console.error(e);
    $("status").textContent="อัปเดตไม่สำเร็จ: ตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง";
  }finally{
    $("refresh").disabled=false;
    $("refresh").textContent="🔄 อัปเดตข้อมูลอากาศ";
  }
}

async function init(){
 try{
  const r=await fetch(GEO_URL); state.geo=await r.json(); state.features=state.geo.features;
  const select=$("province");select.innerHTML="";
  state.features.forEach(f=>{const n=prop(f,"pro_th","NAME_1","name_th","name");const o=document.createElement("option");o.value=n;o.textContent=n;select.appendChild(o)});
  $("status").textContent=`พบขอบเขต ${state.features.length} จังหวัด`;
  select.addEventListener("change",()=>{const f=state.features.find(x=>prop(x,"pro_th","NAME_1","name_th","name")===select.value);if(f)show(f)});
  $("refresh").addEventListener("click",loadWeather);
  $("fit").addEventListener("click",draw);
  window.addEventListener("resize",draw);
  draw();
  await loadWeather();
  if(state.features[0])show(state.features[0]);

  // อัปเดตอัตโนมัติทุก 5 นาที และอัปเดตเมื่อกลับมาเปิดหน้าเว็บ
  setInterval(()=>{ if(!document.hidden) loadWeather(); },5*60*1000);
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) loadWeather(); });
 }catch(e){
  $("status").textContent="โหลดแผนที่ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต";
  console.error(e);
 }
}
init();
