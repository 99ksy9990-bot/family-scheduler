import { useState, useReducer, useCallback, useRef } from "react";

/* ─── PALETTE ──────────────────────────── */
const C = {
  sky:"#38BDF8",skyBg:"#E0F2FE",skyDeep:"#075985",
  violet:"#818CF8",violetBg:"#EDE9FE",violetDeep:"#3730A3",
  mint:"#4ADE80",mintBg:"#DCFCE7",mintDeep:"#14532D",
  rose:"#FB7185",roseBg:"#FFE4E6",roseDeep:"#881337",
  amber:"#FBBF24",amberBg:"#FEF9C3",amberDeep:"#78350F",
  teal:"#2DD4BF",tealBg:"#CCFBF1",tealDeep:"#134E4A",
  red:"#EF4444",redBg:"#FEE2E2",
  gray50:"#F8FAFC",gray100:"#F1F5F9",gray200:"#E2E8F0",
  gray400:"#94A3B8",gray600:"#475569",gray800:"#1E293B",
  white:"#FFFFFF",page:"#F0F9FF",
};

/* ─── 12지신 ───────────────────────────── */
const ZODIAC=[
  {key:"rat",e:"🐭",bg:"#FEE2E2",c:"#EF4444"},
  {key:"ox",e:"🐮",bg:"#FEF3C7",c:"#D97706"},
  {key:"tiger",e:"🐯",bg:"#FFF7ED",c:"#EA580C"},
  {key:"rabbit",e:"🐰",bg:"#FCE7F3",c:"#DB2777"},
  {key:"dragon",e:"🐲",bg:"#ECFDF5",c:"#059669"},
  {key:"snake",e:"🐍",bg:"#F0FDF4",c:"#16A34A"},
  {key:"horse",e:"🐴",bg:"#EFF6FF",c:"#2563EB"},
  {key:"goat",e:"🐑",bg:"#F5F3FF",c:"#7C3AED"},
  {key:"monkey",e:"🐵",bg:"#FFF7ED",c:"#C2410C"},
  {key:"rooster",e:"🐔",bg:"#FFFBEB",c:"#B45309"},
  {key:"dog",e:"🐶",bg:"#FEF2F2",c:"#DC2626"},
  {key:"pig",e:"🐷",bg:"#FDF4FF",c:"#A21CAF"},
];
const getZ=k=>ZODIAC.find(z=>z.key===k)||ZODIAC[0];
const MEMBER_COLORS=[
  {color:C.rose,bg:C.roseBg,deep:C.roseDeep,label:"코랄"},
  {color:C.sky,bg:C.skyBg,deep:C.skyDeep,label:"스카이"},
  {color:C.violet,bg:C.violetBg,deep:C.violetDeep,label:"바이올렛"},
  {color:C.mint,bg:C.mintBg,deep:C.mintDeep,label:"민트"},
  {color:C.amber,bg:C.amberBg,deep:C.amberDeep,label:"앰버"},
  {color:C.teal,bg:C.tealBg,deep:C.tealDeep,label:"틸"},
];

/* ─── SHIFT ────────────────────────────── */
const DEFAULT_SHIFT_TYPES={
  D:{label:"D",full:"Day",   color:"#1D4ED8",bg:"#DBEAFE",time:"07:30~15:30",enabled:true},
  E:{label:"E",full:"Evening",color:"#6D28D9",bg:"#EDE9FE",time:"15:30~23:30",enabled:true},
  N:{label:"N",full:"Night", color:"#0F766E",bg:"#CCFBF1",time:"23:30~07:30",enabled:true},
  OFF:{label:"OFF",full:"Off",color:"#64748B",bg:"#F1F5F9",time:"-",enabled:true},
};
const SHIFT_BASE=new Date("2026-05-01T00:00:00");
function getShift(shiftMap,memberId,ds){
  return (shiftMap[memberId]||{})[ds]||null;
}
function firstWord(v){return String(v||"").trim().split(/\s+/)[0]||"";}
function shiftLabel(v){return v?.label||firstWord(v?.full)||"-";}

/* ─── HOLIDAYS ─────────────────────────── */
const HOLIDAYS={"2026-05-25":"부처님오신날","2026-06-06":"현충일","2026-08-15":"광복절","2026-10-03":"개천절","2026-10-09":"한글날","2026-12-25":"크리스마스"};

/* ─── DATE HELPERS ─────────────────────── */
const TODAY="2026-05-25";
const DAYS_KO=["일","월","화","수","목","금","토"];
const ROUTINE_DAYS=["일","월","화","수","목","금","토"];
const MONTHS_KO=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
function mkDs(y,m,d){return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function sameDays(a=[],b=[]){return a.length===b.length&&a.every((d,i)=>d===b[i]);}
function parseRepeatDays(repeat,days){
  if(Array.isArray(days)&&days.length)return ROUTINE_DAYS.filter(d=>days.includes(d));
  const txt=String(repeat||"");
  if(txt.includes("매일"))return ROUTINE_DAYS;
  if(txt.includes("평일"))return ["월","화","수","목","금"];
  if(txt.includes("주말"))return ["일","토"];
  const picked=ROUTINE_DAYS.filter(d=>txt.includes(d));
  return picked.length?picked:[];
}
function formatRepeatDays(days=[]){
  const ordered=ROUTINE_DAYS.filter(d=>days.includes(d));
  if(sameDays(ordered,ROUTINE_DAYS))return"매일";
  if(sameDays(ordered,["월","화","수","목","금"]))return"평일";
  if(sameDays(ordered,["일","토"]))return"주말";
  return ordered.length?`매주 ${ordered.join("·")}`:"요일 선택";
}
function calcDday(month,day,baseYear=2026){
  const td=new Date(TODAY+"T00:00:00");
  let dt=new Date(baseYear,month-1,day);
  if(dt<td)dt=new Date(baseYear+1,month-1,day);
  return{diff:Math.round((dt-td)/86400000),year:dt.getFullYear()};
}
function calcAge(birthYear,birthMonth,birthDay,onYear,onMonth,onDay){
  let age=onYear-birthYear;
  if(onMonth<birthMonth||(onMonth===birthMonth&&onDay<birthDay))age--;
  return age;
}
function calcAnniv(fromYear,fromMonth,fromDay,toYear){
  return toYear-fromYear;
}
function calcDaySince(fromYear,fromMonth,fromDay,toYear,toMonth,toDay){
  const f=new Date(fromYear,fromMonth-1,fromDay);
  const t=new Date(toYear,toMonth-1,toDay);
  return Math.round((t-f)/86400000);
}

/* ─── ANNIVERSARY HELPERS ──────────────── */
const ALERT_PRESETS=["14일 전","7일 전","1일 전","당일"];
function annivSubtitle(a,dday,members=[]){
  const targetYear=dday.year;
  const tm=a.isLunar?(a.solarMonth||a.month):a.month;
  const td2=a.isLunar?(a.solarDay||a.day):a.day;
  if(a.hideAge)return"";
  if(a.type==="birthday"&&a.birthYear){
    const age=calcAge(a.birthYear,tm,td2,targetYear,tm,td2);
    const member=members.find(m=>m.id===a.memberId);
    if(a.relation)return`${age}번째 생신 / 만 ${age}세`;
    if(member?.role==="자녀")return`만 ${age}세 되는 날`;
    return`만 ${age}세`;
  }
  if(a.type==="anniversary"&&a.startYear){
    const yrs=calcAnniv(a.startYear,tm,td2,targetYear);
    return a.label?.includes("결혼")?`결혼 ${yrs}주년`:`${yrs}주년`;
  }
  if(a.type==="baby"&&(a.startYear||a.birthYear)){
    const sy=a.startYear||a.birthYear;
    const days=calcDaySince(sy,tm,td2,new Date(TODAY+"T00:00:00").getFullYear(),
      new Date(TODAY+"T00:00:00").getMonth()+1,new Date(TODAY+"T00:00:00").getDate());
    return`생후 ${days}일`;
  }
  return"";
}
function annivLunarLine(a){
  if(!a.isLunar)return"";
  const sm=a.solarMonth||a.month;
  const sd=a.solarDay||a.day;
  return`음력 ${a.month}월 ${a.day}일 → 올해 양력 ${sm}월 ${sd}일`;
}
function annivSourceLabel(a){
  return a.source==="auto"?"자동 생성됨":"직접 추가";
}

/* ─── INITIAL DATA ─────────────────────── */
const INIT_MEMBERS=[
  {id:1,name:"엄마",zodiac:"rabbit",color:C.rose,bg:C.roseBg,deep:C.roseDeep,isShift:true,role:"보호자"},
  {id:2,name:"아빠",zodiac:"tiger",color:C.sky,bg:C.skyBg,deep:C.skyDeep,isShift:false,role:"보호자"},
  {id:3,name:"수아",zodiac:"horse",color:C.violet,bg:C.violetBg,deep:C.violetDeep,isShift:false,role:"자녀",birthYear:2014},
  {id:4,name:"민준",zodiac:"pig",color:C.mint,bg:C.mintBg,deep:C.mintDeep,isShift:false,role:"자녀",birthYear:2021},
];
const INIT_SHIFT_MAP={
  1:Object.fromEntries(Array.from({length:31},(_,i)=>{
    const ptn=["D","D","E","E","N","N","OFF","OFF","OFF"];
    return[`2026-05-${String(i+1).padStart(2,"0")}`,ptn[i%ptn.length]];
  })),
};
const INIT_EVENTS={
  "2026-05-25":[
    {id:1,title:"수아 영어학원",timeS:"16:00",timeE:"17:30",memberId:3,place:"YBM학원",isRoutine:true,repeat:"매주 화·목"},
    {id:2,title:"저녁 가족모임",timeS:"19:00",timeE:"",memberId:null,place:"집",isRoutine:false},
  ],
  "2026-05-26":[
    {id:3,title:"아빠 출장",timeS:"08:00",timeE:"",memberId:2,place:"서울"},
    {id:4,title:"민준 수학학원",timeS:"15:00",timeE:"17:00",memberId:4,place:"CMS수학",isRoutine:true,repeat:"매주 월·수"},
  ],
  "2026-05-28":[{id:5,title:"가족 영화 관람",timeS:"14:00",timeE:"16:30",memberId:null,place:"CGV 광양"}],
  "2026-06-01":[{id:6,title:"민준 생일 🎂",timeS:"",timeE:"",memberId:4,place:"",isAnniv:true}],
};
const INIT_TODOS=[
  {id:1,text:"주말 장보기",done:false,memberId:2,due:"오늘",isRoutine:false},
  {id:2,text:"수아 물통 챙기기",done:false,memberId:1,repeat:"평일 아침",isRoutine:true},
  {id:3,text:"자동차 보험 갱신",done:false,memberId:2,due:"오늘",isRoutine:false},
  {id:4,text:"쓰레기 분리수거",done:true,memberId:null,isRoutine:false},
  {id:5,text:"민준 학원비 납부",done:true,memberId:2,isRoutine:false},
];
const INIT_ANNIV=[
  {id:1,label:"수아 생일 🎂",type:"birthday",isLunar:false,month:8,day:14,memberId:3,birthYear:2014,source:"auto",alerts:["7일 전","1일 전","당일"],showHome:true,showCalendar:true},
  {id:2,label:"민준 생일 🎂",type:"birthday",isLunar:false,month:6,day:1,memberId:4,birthYear:2021,source:"auto",alerts:["7일 전","1일 전","당일"],showHome:true,showCalendar:true},
  {id:3,label:"엄마 생일 🎂",type:"birthday",isLunar:false,month:11,day:3,memberId:1,birthYear:1988,source:"auto",alerts:["7일 전","1일 전","당일"],showHome:true,showCalendar:true},
  {id:4,label:"결혼기념일 💍",type:"anniversary",isLunar:false,month:10,day:8,startYear:2016,source:"manual",alerts:["14일 전","1일 전","당일"],showHome:true,showCalendar:true},
  {id:5,label:"친정어머니 생신 🎂",type:"birthday",isLunar:true,solarMonth:8,solarDay:20,month:7,day:17,memberId:null,relation:"외할머니",birthYear:1958,source:"manual",alerts:["14일 전","7일 전","당일"],showHome:true,showCalendar:true},
];

const TIMETABLE_DAYS=["월","화","수","목","금"];
const SUBJECT_COLORS=[C.rose,C.sky,C.violet,C.mint,C.amber,C.teal];
const INIT_TIMETABLE={
  3:{
    월:[
      {period:1,time:"09:00~09:45",subject:"국어",color:C.rose},
      {period:2,time:"09:55~10:40",subject:"수학",color:C.sky},
      {period:3,time:"10:50~11:35",subject:"영어",color:C.violet},
      {period:4,time:"11:45~12:30",subject:"미술",color:C.mint},
    ],
    화:[
      {period:1,time:"09:00~09:45",subject:"사회",color:C.amber},
      {period:2,time:"09:55~10:40",subject:"과학",color:C.teal},
      {period:3,time:"10:50~11:35",subject:"수학",color:C.sky},
      {period:4,time:"11:45~12:30",subject:"체육",color:C.mint},
    ],
    수:[
      {period:1,time:"09:00~09:45",subject:"영어",color:C.violet},
      {period:2,time:"09:55~10:40",subject:"국어",color:C.rose},
      {period:3,time:"10:50~11:35",subject:"음악",color:C.amber},
      {period:4,time:"11:45~12:30",subject:"창체",color:C.teal},
    ],
    목:[
      {period:1,time:"09:00~09:45",subject:"수학",color:C.sky},
      {period:2,time:"09:55~10:40",subject:"과학",color:C.teal},
      {period:3,time:"10:50~11:35",subject:"국어",color:C.rose},
      {period:4,time:"11:45~12:30",subject:"영어",color:C.violet},
    ],
    금:[
      {period:1,time:"09:00~09:45",subject:"국어",color:C.rose},
      {period:2,time:"09:55~10:40",subject:"체육",color:C.mint},
      {period:3,time:"10:50~11:35",subject:"수학",color:C.sky},
      {period:4,time:"11:45~12:30",subject:"미술",color:C.mint},
    ],
  },
  4:{
    월:[
      {period:1,time:"09:00~09:40",subject:"한글",color:C.rose},
      {period:2,time:"09:50~10:30",subject:"놀이",color:C.mint},
      {period:3,time:"10:40~11:20",subject:"수학",color:C.sky},
    ],
  },
};

const GREET_POOL=[
  {h:[0,6],m:["새벽에도 열심이네요 🌙"]},
  {h:[6,10],m:["좋은 아침이에요 ☀️","오늘도 힘차게! 🌅","상쾌한 아침 🌤","파이팅 💪","좋은 하루 🍀"]},
  {h:[10,14],m:["점심 먹었어요? 🍚","오전 수고했어요 👏"]},
  {h:[14,18],m:["오후가 깊어가네요 🌇","학원 잘 다녀왔어요? 📚"]},
  {h:[18,22],m:["좋은 저녁이에요 🌆","오늘도 수고했어요 🌙"]},
  {h:[22,24],m:["내일도 좋은 하루 🌟","모두 잘 자요 😴"]},
];
function greeting(){const h=new Date().getHours();const p=GREET_POOL.find(x=>h>=x.h[0]&&h<x.h[1])||GREET_POOL[1];return p.m[Math.floor(Math.random()*p.m.length)];}

/* ─── SHARED COMPONENTS ────────────────── */
function Tag({label,color,bg}){
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:bg,color,display:"inline-block",lineHeight:"16px"}}>{label}</span>;
}
function ZBadge({member,size=30,bordered=true}){
  if(!member)return null;const z=getZ(member.zodiac);
  return <div style={{width:size,height:size,borderRadius:"50%",background:bordered?z.bg:"transparent",border:bordered?`2px solid ${z.c}`:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.52,flexShrink:0,lineHeight:1}}>{z.e}</div>;
}

/* KEY FIX: Sheet rendered INSIDE phone container, position:absolute */
function Sheet({open,onClose,children,title}){
  if(!open)return null;
  return(
    <div style={{position:"absolute",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)"}} onClick={onClose}/>
      <div style={{position:"relative",background:C.white,borderRadius:"20px 20px 0 0",maxHeight:"80%",overflowY:"auto",paddingBottom:24}}>
        <div style={{width:36,height:4,borderRadius:2,background:C.gray200,margin:"10px auto 0",display:"block"}}/>
        {title&&<p style={{fontSize:14,fontWeight:800,color:C.gray800,margin:"12px 20px 4px"}}>{title}</p>}
        <div style={{padding:"8px 20px 0"}}>{children}</div>
      </div>
    </div>
  );
}

function Toast({msg,onUndo,onDone}){
  return(
    <div style={{position:"absolute",bottom:80,left:"50%",transform:"translateX(-50%)",
      background:C.gray800,color:"#fff",borderRadius:12,padding:"10px 16px",
      display:"flex",alignItems:"center",gap:12,zIndex:300,
      boxShadow:"0 4px 20px rgba(0,0,0,0.3)",whiteSpace:"nowrap",fontSize:13}}>
      <span>{msg}</span>
      {onUndo&&<button onClick={onUndo} style={{background:"none",border:"none",color:C.sky,fontSize:13,fontWeight:800,cursor:"pointer",padding:0}}>되돌리기</button>}
    </div>
  );
}

function Btn({label,color,bg,onClick,full,outline}){
  return(
    <button onClick={onClick} style={{
      padding:"12px 16px",borderRadius:12,border:outline?`1.5px solid ${color}`:"none",
      background:outline?"transparent":bg||C.gray100,color:color||C.gray600,
      fontSize:13,fontWeight:700,cursor:"pointer",width:full?"100%":"auto",
      textAlign:"left",display:"block",marginBottom:8}}>
      {label}
    </button>
  );
}

function RepeatDayPicker({days,onChange,compact=false}){
  const selected=Array.isArray(days)?days:[];
  function toggle(day){
    const next=selected.includes(day)?selected.filter(d=>d!==day):ROUTINE_DAYS.filter(d=>[...selected,day].includes(d));
    onChange(next);
  }
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,marginBottom:6}}>
        {ROUTINE_DAYS.map((d,i)=>{
          const sel=selected.includes(d);
          const weekend=i===0||i===6;
          return(
            <button key={d} onClick={()=>toggle(d)} style={{
              height:compact?30:34,borderRadius:12,border:`1.5px solid ${sel?C.violet:C.gray200}`,
              background:sel?C.violetBg:C.white,color:sel?C.violetDeep:(weekend?C.roseDeep:C.gray600),
              fontSize:12,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
            }}>{d}</button>
          );
        })}
      </div>
      <p style={{margin:0,fontSize:11,color:selected.length?C.violetDeep:C.gray400,fontWeight:selected.length?800:600}}>
        {selected.length?formatRepeatDays(selected):"반복할 요일을 선택하세요"}
      </p>
    </div>
  );
}

function FireworkBurst({burst}){
  if(!burst)return null;
  const colors=[C.amber,C.rose,C.sky,C.mint,C.violet,C.teal,"#FB923C","#22C55E"];
  const particles=Array.from({length:34},(_,i)=>{
    const angle=(Math.PI*2*i)/34;
    const dist=72+(i%5)*16;
    return{
      x:Math.cos(angle)*dist,
      y:Math.sin(angle)*dist,
      color:colors[i%colors.length],
      size:5+(i%4)*2,
      delay:(i%7)*0.015,
    };
  });
  return(
    <div key={burst} style={{position:"absolute",inset:0,zIndex:260,pointerEvents:"none",overflow:"hidden"}}>
      <style>{`
        @keyframes fs-particle {
          0% { transform: translate(-50%, -50%) scale(0.25) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          78% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(0.1) rotate(240deg); opacity: 0; }
        }
        @keyframes fs-ring {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.95; }
          100% { transform: translate(-50%, -50%) scale(2.7); opacity: 0; }
        }
        @keyframes fs-pop {
          0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
          18% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -62%) scale(0.92); opacity: 0; }
        }
      `}</style>
      <div style={{position:"absolute",left:"50%",top:"43%",width:78,height:78,borderRadius:"50%",border:`3px solid ${C.amber}`,animation:"fs-ring 900ms ease-out forwards"}}/>
      <div style={{position:"absolute",left:"50%",top:"43%",width:122,height:122,borderRadius:"50%",border:`2px solid ${C.sky}`,animation:"fs-ring 1050ms 80ms ease-out forwards"}}/>
      {particles.map((p,i)=>(
        <div key={i} style={{
          position:"absolute",left:"50%",top:"43%",width:p.size,height:p.size,
          borderRadius:i%3===0?2:"50%",background:p.color,
          boxShadow:`0 0 10px ${p.color}88`,
          "--x":`${p.x}px`,"--y":`${p.y}px`,
          animation:`fs-particle 980ms ${p.delay}s cubic-bezier(.16,.8,.28,1) forwards`,
        }}/>
      ))}
      <div style={{position:"absolute",left:"50%",top:"43%",background:C.white,color:C.gray800,borderRadius:18,padding:"10px 16px",fontSize:15,fontWeight:900,boxShadow:"0 12px 34px rgba(30,41,59,0.18)",animation:"fs-pop 1200ms ease-out forwards"}}>
        완료!
      </div>
    </div>
  );
}

/* ─── CALENDAR REDUCER ─────────────────── */
function ymReducer(state,action){
  let{year,month}=state;
  if(action.type==="PREV"){month--;if(month<0){month=11;year--;}}
  if(action.type==="NEXT"){month++;if(month>11){month=0;year++;}}
  return{year,month};
}

/* ════════════════════════════════════════
   HOME SCREEN
════════════════════════════════════════ */
function HomeScreen({members,events,setEvents,todos,setTodos,shiftMap,shiftTypes,anniv,goTab}){
  const [greet]=useState(()=>greeting());
  const [sheet,setSheet]=useState(null);
  const [toast,setToast]=useState(null);
  const [showDone,setShowDone]=useState(false);
  const [editForm,setEditForm]=useState({});
  const [celebration,setCelebration]=useState(null);

  const todayEvs=events[TODAY]||[];
  const upcoming=Object.entries(events).filter(([d])=>d>TODAY).sort(([a],[b])=>a.localeCompare(b)).slice(0,3).flatMap(([date,evs])=>evs.map(e=>({...e,date})));
  const todayTodos=todos.filter(t=>!t.done&&!t.isRoutine&&!t.skipped);
  const todayRoutines=todos.filter(t=>!t.done&&t.isRoutine&&!t.skipped&&!t.disabled);
  const doneTodos=todos.filter(t=>t.done);
  const shiftMem=members.find(m=>m.isShift)||null;

  function showToast(msg,undoFn){
    setToast({msg,undoFn});
    setTimeout(()=>setToast(null),4500);
  }
  function triggerCelebration(){
    const id=Date.now();
    setCelebration(id);
    setTimeout(()=>setCelebration(null),1250);
  }
  function deleteEvent(ev){
    const date=ev.date||TODAY;
    if(!ev)return;
    setEvents(p=>({...p,[date]:(p[date]||[]).filter(e=>e.id!==ev.id)}));
    setSheet(null);
    showToast("일정이 삭제되었습니다.",()=>setEvents(p=>({...p,[date]:[...(p[date]||[]),ev]})));
  }
  function openEventEdit(ev){
    setEditForm({id:ev.id,date:ev.date||TODAY,title:ev.title,timeS:ev.timeS||"",timeE:ev.timeE||"",place:ev.place||"",memberId:ev.memberId||"",repeat:ev.repeat||"",repeatDays:parseRepeatDays(ev.repeat,ev.repeatDays)});
    setSheet({type:"eventEdit",data:ev});
  }
  function saveEventEdit(){
    const repeat=editForm.repeatDays?.length?formatRepeatDays(editForm.repeatDays):editForm.repeat;
    setEvents(p=>({...p,[editForm.date]:(p[editForm.date]||[]).map(e=>e.id===editForm.id?{...e,title:editForm.title,timeS:editForm.timeS,timeE:editForm.timeE,place:editForm.place,memberId:editForm.memberId?+editForm.memberId:null,repeat:e.isRoutine?repeat:e.repeat,repeatDays:e.isRoutine?editForm.repeatDays:e.repeatDays}:e)}));
    setSheet(null);
    showToast("일정을 수정했습니다.");
  }
  function checkTodo(id){triggerCelebration();setTodos(p=>p.map(t=>t.id===id?{...t,done:true}:t));}
  function skipRoutine(id){setTodos(p=>p.map(t=>t.id===id?{...t,skipped:true}:t));setSheet(null);showToast("오늘만 건너뜁니다.");}
  function disableRoutine(id){setTodos(p=>p.map(t=>t.id===id?{...t,disabled:true}:t));setSheet(null);showToast("루틴을 껐습니다.");}
  function postpone(id){setTodos(p=>p.map(t=>t.id===id?{...t,due:"내일"}:t));setSheet(null);showToast("내일로 미뤘습니다.");}

  const ddays=anniv.filter(a=>a.showHome!==false).map(a=>{const dd=calcDday(a.isLunar?a.solarMonth:a.month,a.isLunar?a.solarDay:a.day);return{...a,...dd};}).sort((a,b)=>a.diff-b.diff).slice(0,2);

  function EventSheet({ev}){
    const m=members.find(x=>x.id===ev.memberId)||null;
    const ts=ev.timeS?(ev.timeE?`${ev.timeS}~${ev.timeE}`:ev.timeS):"종일";
    return(<>
      <div style={{background:C.gray50,borderRadius:14,padding:"12px 14px",marginBottom:14}}>
        <p style={{margin:"0 0 4px",fontSize:15,fontWeight:800,color:C.gray800}}>{ev.title}</p>
        <p style={{margin:0,fontSize:12,color:C.gray600}}>{ts}{ev.place?` · ${ev.place}`:""}</p>
        {m&&<p style={{margin:"2px 0 0",fontSize:12,color:C.gray400}}>참여: {m.name} {getZ(m.zodiac).e}</p>}
        {ev.repeat&&<p style={{margin:"2px 0 0",fontSize:12,color:C.gray400}}>반복: {ev.repeat}</p>}
      </div>
      <Btn label="✏️ 수정" color={C.skyDeep} bg={C.skyBg} full onClick={()=>openEventEdit(ev)}/>
      {ev.isRoutine?(
        <Btn label="🗑 삭제 (루틴 분기)" color={C.red} bg={C.redBg} full onClick={()=>setSheet({type:"routineDel",data:ev})}/>
      ):(
        <Btn label="🗑 삭제" color={C.red} bg={C.redBg} full onClick={()=>setSheet({type:"confirmDel",data:ev,target:"event"})}/>
      )}
      <Btn label="📅 달력에서 보기" color={C.gray600} bg={C.gray50} full onClick={()=>{setSheet(null);goTab("calendar");}}/>
    </>);
  }

  function EventEditSheet(){
    return(<>
      <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>제목</label>
      <input value={editForm.title||""} onChange={e=>setEditForm(p=>({...p,title:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:14,outline:"none",marginBottom:10,fontFamily:"inherit"}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <input type="time" value={editForm.timeS||""} onChange={e=>setEditForm(p=>({...p,timeS:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
        <input type="time" value={editForm.timeE||""} onChange={e=>setEditForm(p=>({...p,timeE:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
      </div>
      <input value={editForm.place||""} onChange={e=>setEditForm(p=>({...p,place:e.target.value}))} placeholder="장소" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,fontFamily:"inherit"}}/>
      {sheet.data?.isRoutine&&(
        <>
          <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>반복 규칙</label>
          <RepeatDayPicker days={editForm.repeatDays||[]} onChange={days=>setEditForm(p=>({...p,repeatDays:days,repeat:formatRepeatDays(days)}))}/>
        </>
      )}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {members.map(m=>{const sel=String(editForm.memberId)===String(m.id);return <button key={m.id} onClick={()=>setEditForm(p=>({...p,memberId:sel?"":m.id}))} style={{padding:"5px 10px",borderRadius:20,border:`1.5px solid ${sel?m.color:C.gray200}`,background:sel?m.bg:C.white,color:sel?m.deep:C.gray600,fontSize:11,fontWeight:700,cursor:"pointer"}}>{getZ(m.zodiac).e} {m.name}</button>;})}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setSheet({type:"event",data:sheet.data})} style={{flex:1,padding:10,borderRadius:12,background:C.gray100,border:"none",color:C.gray600,fontSize:13,fontWeight:700,cursor:"pointer"}}>취소</button>
        <button onClick={saveEventEdit} style={{flex:2,padding:10,borderRadius:12,background:editForm.title?"linear-gradient(135deg,#38BDF8,#818CF8)":C.gray200,border:"none",color:editForm.title?"#fff":C.gray400,fontSize:13,fontWeight:800,cursor:editForm.title?"pointer":"not-allowed"}}>저장</button>
      </div>
    </>);
  }

  function RoutineDelSheet({ev}){
    return(<>
      <p style={{fontSize:13,color:C.gray600,marginBottom:12}}>{ev.title}</p>
      {[
        {l:"⏭ 오늘만 건너뛰기",sub:"이번 한 번만",c:C.sky,bg:C.skyBg,fn:()=>skipRoutine(ev.id)},
        {l:"🗑 이 날짜만 삭제",sub:"오늘 일정만",c:C.amber,bg:C.amberBg,fn:()=>deleteEvent(ev)},
        {l:"🔁 반복 루틴 수정",sub:"반복 규칙 변경",c:C.violet,bg:C.violetBg,fn:()=>openEventEdit(ev)},
        {l:"🗑 루틴 전체 삭제",sub:"모든 반복 삭제",c:C.red,bg:C.redBg,fn:()=>deleteEvent(ev)},
      ].map((item,i)=>(
        <button key={i} onClick={item.fn} style={{width:"100%",padding:"12px 14px",borderRadius:12,
          marginBottom:8,background:item.bg,border:"none",cursor:"pointer",textAlign:"left"}}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:item.c}}>{item.l}</p>
          <p style={{margin:"1px 0 0",fontSize:11,color:item.c,opacity:0.7}}>{item.sub}</p>
        </button>
      ))}
      <Btn label="취소" color={C.gray400} bg={C.gray100} full onClick={()=>setSheet(null)}/>
    </>);
  }

  function ConfirmDelSheet({ev,target}){
    return(<>
      <p style={{fontSize:14,color:C.gray600,margin:"0 0 20px"}}>{ev.title||ev.text}을 삭제할까요?</p>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setSheet(null)} style={{flex:1,padding:13,borderRadius:12,background:C.gray100,border:"none",color:C.gray600,fontSize:14,fontWeight:700,cursor:"pointer"}}>취소</button>
        <button onClick={()=>target==="event"?deleteEvent(ev):deleteTodoFn(ev.id)}
          style={{flex:1,padding:13,borderRadius:12,background:C.red,border:"none",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>삭제</button>
      </div>
    </>);
  }
  function deleteTodoFn(id){const t=todos.find(x=>x.id===id);setTodos(p=>p.filter(x=>x.id!==id));setSheet(null);showToast("삭제됨",()=>setTodos(p=>[...p,t]));}
  function openTodoEdit(todo){
    setEditForm({id:todo.id,text:todo.text,memberId:todo.memberId||"",due:todo.due||"",repeat:todo.repeat||"",repeatDays:parseRepeatDays(todo.repeat,todo.repeatDays)});
    setSheet({type:"todoEdit",data:todo});
  }
  function saveTodoEdit(){
    const repeat=editForm.repeatDays?.length?formatRepeatDays(editForm.repeatDays):editForm.repeat;
    setTodos(p=>p.map(t=>t.id===editForm.id?{...t,text:editForm.text,memberId:editForm.memberId?+editForm.memberId:null,due:t.isRoutine?undefined:editForm.due,repeat:t.isRoutine?repeat:undefined,repeatDays:t.isRoutine?editForm.repeatDays:t.repeatDays}:t));
    setSheet(null);
    showToast("수정했습니다.");
  }

  function TodoSheet({todo}){
    const m=members.find(x=>x.id===todo.memberId)||null;
    if(todo.isRoutine)return(<>
      <p style={{fontSize:13,color:C.gray600,marginBottom:12}}>{todo.text} {m?`· ${m.name}`:""}</p>
      <Btn label="✅ 완료" color={C.mintDeep} bg={C.mintBg} full onClick={()=>{checkTodo(todo.id);setSheet(null);}}/>
      <Btn label="⏭ 오늘만 건너뛰기" color={C.skyDeep} bg={C.skyBg} full onClick={()=>skipRoutine(todo.id)}/>
      <Btn label="📅 내일로 미루기" color={C.amberDeep} bg={C.amberBg} full onClick={()=>postpone(todo.id)}/>
      <Btn label="🔁 반복 루틴 수정" color={C.violetDeep} bg={C.violetBg} full onClick={()=>openTodoEdit(todo)}/>
      <Btn label="🔕 루틴 끄기" color={C.gray600} bg={C.gray100} full onClick={()=>disableRoutine(todo.id)}/>
    </>);
    return(<>
      <p style={{fontSize:13,color:C.gray600,marginBottom:12}}>{todo.text} {m?`· ${m.name}`:""}</p>
      <Btn label="✅ 완료" color={C.mintDeep} bg={C.mintBg} full onClick={()=>{checkTodo(todo.id);setSheet(null);}}/>
      <Btn label="📅 내일로 미루기" color={C.amberDeep} bg={C.amberBg} full onClick={()=>postpone(todo.id)}/>
      <Btn label="✏️ 수정" color={C.skyDeep} bg={C.skyBg} full onClick={()=>openTodoEdit(todo)}/>
      <Btn label="🗑 삭제" color={C.red} bg={C.redBg} full onClick={()=>setSheet({type:"confirmDel",data:todo,target:"todo"})}/>
    </>);
  }

  function TodoEditSheet(){
    const isRoutine=sheet.data?.isRoutine;
    return(<>
      <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>제목</label>
      <input value={editForm.text||""} onChange={e=>setEditForm(p=>({...p,text:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:14,outline:"none",marginBottom:10,fontFamily:"inherit"}}/>
      <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>{isRoutine?"반복 규칙":"마감"}</label>
      {isRoutine?(
        <RepeatDayPicker days={editForm.repeatDays||[]} onChange={days=>setEditForm(p=>({...p,repeatDays:days,repeat:formatRepeatDays(days)}))}/>
      ):(
        <input value={editForm.due||""} onChange={e=>setEditForm(p=>({...p,due:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,fontFamily:"inherit"}}/>
      )}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {members.map(m=>{const sel=String(editForm.memberId)===String(m.id);return <button key={m.id} onClick={()=>setEditForm(p=>({...p,memberId:sel?"":m.id}))} style={{padding:"5px 10px",borderRadius:20,border:`1.5px solid ${sel?m.color:C.gray200}`,background:sel?m.bg:C.white,color:sel?m.deep:C.gray600,fontSize:11,fontWeight:700,cursor:"pointer"}}>{getZ(m.zodiac).e} {m.name}</button>;})}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setSheet({type:"todo",data:sheet.data})} style={{flex:1,padding:10,borderRadius:12,background:C.gray100,border:"none",color:C.gray600,fontSize:13,fontWeight:700,cursor:"pointer"}}>취소</button>
        <button onClick={saveTodoEdit} style={{flex:2,padding:10,borderRadius:12,background:editForm.text?"linear-gradient(135deg,#38BDF8,#818CF8)":C.gray200,border:"none",color:editForm.text?"#fff":C.gray400,fontSize:13,fontWeight:800,cursor:editForm.text?"pointer":"not-allowed"}}>저장</button>
      </div>
    </>);
  }

  function EventCard({ev}){
    const m=members.find(x=>x.id===ev.memberId)||null;
    const ts=ev.timeS?(ev.timeE?`${ev.timeS}~${ev.timeE}`:ev.timeS):"종일";
    return(
      <div onClick={()=>setSheet({type:"event",data:ev})}
        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
        marginBottom:6,background:C.gray50,borderRadius:12,cursor:"pointer",
        borderLeft:`3px solid ${m?m.color:C.gray200}`}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontSize:13,fontWeight:700,color:C.gray800}}>{ev.title}</span>
            {ev.isRoutine&&<Tag label="루틴" color={m?.deep||C.gray600} bg={m?.bg||C.gray100}/>}
            {ev.isAnniv&&<Tag label="기념일" color={C.amberDeep} bg={C.amberBg}/>}
          </div>
          <span style={{fontSize:11,color:C.gray400}}>{ts}{ev.place?` · ${ev.place}`:""}</span>
        </div>
        {m&&<ZBadge member={m} size={28} bordered={false}/>}
        <span style={{color:C.gray200,fontSize:14}}>›</span>
      </div>
    );
  }

  function TodoCard({todo}){
    const m=members.find(x=>x.id===todo.memberId)||null;
    const isRtn=todo.isRoutine;
    return(
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
        marginBottom:6,background:isRtn?C.violetBg:C.gray50,borderRadius:12}}>
        <button onClick={()=>checkTodo(todo.id)} style={{width:22,height:22,borderRadius:"50%",
          border:`2px solid ${isRtn?C.violet:C.gray200}`,background:"none",
          cursor:"pointer",flexShrink:0}}/>
        <div style={{flex:1}} onClick={()=>setSheet({type:"todo",data:todo})}>
          <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:2}}>
            <span style={{fontSize:13,fontWeight:600,color:C.gray800}}>{todo.text}</span>
            {isRtn&&<Tag label="루틴" color={C.violetDeep} bg="rgba(129,140,248,0.2)"/>}
          </div>
          <span style={{fontSize:11,color:C.gray400}}>
            {m?`담당: ${m.name} · `:""}
            {isRtn?todo.repeat:todo.due||""}
          </span>
        </div>
        {m&&<span style={{fontSize:16}}>{getZ(m.zodiac).e}</span>}
        <span style={{color:C.gray200,fontSize:14,cursor:"pointer"}} onClick={()=>setSheet({type:"todo",data:todo})}>›</span>
      </div>
    );
  }

  return(
    <div style={{height:"100%",overflowY:"auto",paddingBottom:80,position:"relative"}}>
      <FireworkBurst burst={celebration}/>
      {/* Toast */}
      {toast&&<Toast msg={toast.msg} onUndo={toast.undoFn}/>}
      {/* Sheet */}
      <Sheet open={!!sheet} onClose={()=>setSheet(null)}
        title={sheet?.type==="event"?"일정 상세":sheet?.type==="eventEdit"?"일정 수정":sheet?.type==="routineDel"?"루틴 일정 처리":sheet?.type==="confirmDel"?"삭제 확인":sheet?.type==="todo"?"할 일 / 루틴":sheet?.type==="todoEdit"?"할 일 / 루틴 수정":""}>
        {sheet?.type==="event"&&<EventSheet ev={sheet.data}/>}
        {sheet?.type==="eventEdit"&&<EventEditSheet/>}
        {sheet?.type==="routineDel"&&<RoutineDelSheet ev={sheet.data}/>}
        {sheet?.type==="confirmDel"&&<ConfirmDelSheet ev={sheet.data} target={sheet.target}/>}
        {sheet?.type==="todo"&&<TodoSheet todo={sheet.data}/>}
        {sheet?.type==="todoEdit"&&<TodoEditSheet/>}
      </Sheet>

      {/* Hero */}
      <div style={{background:"linear-gradient(150deg,#38BDF8,#818CF8)",padding:"18px 18px 16px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:90,height:90,borderRadius:"50%",background:"rgba(255,255,255,0.07)",top:-18,right:-18}}/>
        <p style={{color:"rgba(255,255,255,0.75)",fontSize:11,margin:"0 0 2px"}}>{TODAY} {DAYS_KO[new Date(TODAY+"T00:00:00").getDay()]}요일</p>
        <p style={{color:"#fff",fontSize:17,fontWeight:700,margin:"0 0 14px",lineHeight:1.4}}>{greet}</p>
        {/* 가족 오늘 요약 */}
        <div style={{display:"flex",gap:10}}>
          {members.map(m=>{
            const z=getZ(m.zodiac);
            const s=m.isShift?getShift(shiftMap,m.id,TODAY):null;
            const st=s?shiftTypes[s]:null;
            const cnt=(events[TODAY]||[]).filter(e=>e.memberId===m.id).length;
            return(
              <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:"rgba(255,255,255,0.2)",border:"2px solid rgba(255,255,255,0.6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,lineHeight:1}}>{z.e}</div>
                <span style={{color:"rgba(255,255,255,0.9)",fontSize:10,fontWeight:700,lineHeight:1}}>{m.name}</span>
                {st&&<span style={{fontSize:9,fontWeight:800,background:st.bg,color:st.color,borderRadius:8,padding:"1px 5px",lineHeight:"14px"}}>{shiftLabel(st)}</span>}
                {!st&&cnt>0&&<span style={{fontSize:9,background:"rgba(255,255,255,0.25)",color:"#fff",borderRadius:8,padding:"1px 5px",lineHeight:"14px"}}>{cnt}개</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{padding:"10px 14px 0"}}>
        {/* 오늘 일정 */}
        <div style={{background:C.white,borderRadius:16,padding:"13px 14px",boxShadow:"0 4px 16px rgba(0,0,0,0.07)",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <span style={{fontSize:13,fontWeight:800,color:C.gray800}}>오늘 일정</span>
            <Tag label={`${todayEvs.length}개`} color={C.skyDeep} bg={C.skyBg}/>
          </div>
          {todayEvs.length===0
            ?<p style={{color:C.gray400,fontSize:12,textAlign:"center",padding:"8px 0",margin:0}}>오늘은 여유있는 하루 🎉</p>
            :todayEvs.map(ev=><EventCard key={ev.id} ev={ev}/>)}
        </div>

        {/* 오늘 할 일·루틴 */}
        <div style={{background:C.white,borderRadius:16,padding:"13px 14px",boxShadow:"0 3px 14px rgba(0,0,0,0.06)",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <span style={{fontSize:13,fontWeight:800,color:C.gray800}}>오늘 할 일 · 루틴</span>
            <button onClick={()=>goTab("todo")} style={{background:"none",border:"none",color:C.sky,fontSize:11,fontWeight:700,cursor:"pointer",padding:0}}>전체보기</button>
          </div>
          {[...todayTodos,...todayRoutines].map(t=><TodoCard key={t.id} todo={t}/>)}
          {doneTodos.length>0&&(
            <>
              <button onClick={()=>setShowDone(v=>!v)} style={{width:"100%",padding:"7px 0",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:C.gray400,fontSize:12,fontWeight:600}}>
                <span>{showDone?"▼":"▶"}</span><span>완료됨 {doneTodos.length}개</span>
              </button>
              {showDone&&doneTodos.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.gray50,borderRadius:12,marginBottom:5,opacity:0.55}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:C.mint,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,flexShrink:0}}>✓</div>
                  <span style={{flex:1,fontSize:13,color:C.gray400,textDecoration:"line-through"}}>{t.text}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* 교대 근무 요약 */}
        {shiftMem&&(
          <div style={{background:C.white,borderRadius:16,padding:"13px 14px",boxShadow:"0 3px 14px rgba(0,0,0,0.06)",marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:800,color:C.gray800,display:"block",marginBottom:10}}>교대 근무 요약</span>
            <div style={{display:"flex",gap:8}}>
              {["2026-05-25","2026-05-26","2026-05-27"].map((d,i)=>{
                const s=getShift(shiftMap,shiftMem.id,d);
                const st=s?shiftTypes[s]:null;
                return(
                  <div key={i} style={{flex:1,padding:"10px",borderRadius:12,textAlign:"center",background:st?st.bg:C.gray50,border:i===0?`1.5px solid ${st?.color||C.gray200}`:"none"}}>
                    <p style={{margin:"0 0 2px",color:C.gray400,fontSize:10}}>{["오늘","내일","모레"][i]}</p>
                    <p style={{margin:0,fontWeight:900,fontSize:16,color:st?st.color:C.gray400}}>{st?shiftLabel(st):"-"}</p>
                    {st&&s!=="OFF"&&<p style={{margin:"1px 0 0",fontSize:9,color:st.color,opacity:0.7}}>{st.time}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 다가오는 일정 */}
        <div style={{background:C.white,borderRadius:16,padding:"13px 14px",boxShadow:"0 3px 14px rgba(0,0,0,0.06)",marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:800,color:C.gray800,display:"block",marginBottom:9}}>다가오는 일정</span>
          {upcoming.map((ev,i)=>{
            const d=new Date(ev.date+"T00:00:00");const m=members.find(x=>x.id===ev.memberId)||null;const hd=HOLIDAYS[ev.date]||"";
            return(
              <div key={i} onClick={()=>setSheet({type:"event",data:ev})}
                style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer",
                padding:"7px 0",borderTop:i>0?`1px solid ${C.gray100}`:"none"}}>
                <div style={{width:34,height:34,borderRadius:9,flexShrink:0,
                  background:hd?"#FEE2E2":C.skyBg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:800,lineHeight:1.3,color:hd?C.red:C.skyDeep}}>{d.getMonth()+1}월</span>
                  <span style={{fontSize:14,fontWeight:900,lineHeight:1,color:hd?C.red:C.skyDeep}}>{d.getDate()}</span>
                </div>
                <div style={{flex:1}}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:C.gray800}}>{ev.title}</p>
                  <p style={{margin:"1px 0 0",fontSize:11,color:C.gray400}}>{ev.timeS||"종일"}{hd&&` · 🎌 ${hd}`}</p>
                </div>
                {m&&<span style={{fontSize:16}}>{getZ(m.zodiac).e}</span>}
                <span style={{color:C.gray200,fontSize:14}}>›</span>
              </div>
            );
          })}
        </div>

        {/* 다가오는 기념일 */}
        <div style={{background:C.white,borderRadius:16,padding:"13px 14px",boxShadow:"0 3px 14px rgba(0,0,0,0.06)",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <span style={{fontSize:13,fontWeight:800,color:C.gray800}}>다가오는 기념일</span>
            <button onClick={()=>goTab("family")} style={{background:"none",border:"none",color:C.sky,fontSize:11,fontWeight:700,cursor:"pointer",padding:0}}>전체보기</button>
          </div>
          {ddays.map((a,i)=>{
            const dd=calcDday(a.isLunar?a.solarMonth:a.month,a.isLunar?a.solarDay:a.day);
            const urgent=dd.diff<=7;
            const sub=annivSubtitle(a,dd,members);
            return(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:i>0?`1px solid ${C.gray100}`:"none"}}>
                <div style={{width:38,height:38,borderRadius:10,flexShrink:0,background:urgent?C.amberBg:C.gray50,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:800,lineHeight:1.3,color:urgent?C.amberDeep:C.gray400}}>{MONTHS_KO[(a.isLunar?a.solarMonth:a.month)-1]}</span>
                  <span style={{fontSize:14,fontWeight:900,lineHeight:1,color:urgent?C.amberDeep:C.gray800}}>{a.isLunar?a.solarDay:a.day}</span>
                </div>
                <div style={{flex:1}}>
                  <span style={{fontSize:13,fontWeight:700,color:C.gray800}}>{a.label}</span>
                  {sub&&<p style={{margin:0,fontSize:11,color:urgent?C.amberDeep:C.gray400}}>{sub}</p>}
                  {a.relation&&<p style={{margin:0,fontSize:11,color:C.gray400}}>{a.relation}</p>}
                </div>
                <span style={{fontSize:12,fontWeight:900,flexShrink:0,color:urgent?C.amberDeep:C.gray400}}>
                  {dd.diff===0?"🎉 오늘":`D-${dd.diff}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   CALENDAR SCREEN
════════════════════════════════════════ */
function CalendarScreen({members,events,setEvents,shiftMap,setShiftMap,shiftTypes,anniv}){
  const [ym,dispYM]=useReducer(ymReducer,{year:2026,month:4});
  const {year,month}=ym;
  const [selected,setSelected]=useState(TODAY);
  const [mode,setMode]=useState("view");
  const [evForm,setEvForm]=useState({title:"",timeS:"",timeE:"",place:"",memberId:""});

  const dim=new Date(year,month+1,0).getDate();
  const fd=new Date(year,month,1).getDay();
  const cells=Array(fd).fill(null).concat(Array.from({length:dim},(_,i)=>i+1));
  const shiftMem=members.find(m=>m.isShift)||null;

  function defShift(ds){
    if(!shiftMem)return null;
    return getShift(shiftMap,shiftMem.id,ds);
  }

  function selectShift(type){
    setShiftMap(prev=>{const mm={...(prev[shiftMem.id]||{}),[selected]:type};return{...prev,[shiftMem.id]:mm};});
    const d=new Date(selected+"T00:00:00");d.setDate(d.getDate()+1);
    const next=d.toISOString().slice(0,10);
    setSelected(next);
    const nm=d.getMonth();
    if(nm!==month)dispYM({type:nm>month||(month===11&&nm===0)?"NEXT":"PREV"});
  }
  function deleteSelectedShift(){
    if(!shiftMem)return;
    setShiftMap(prev=>{
      const mm={...(prev[shiftMem.id]||{})};
      delete mm[selected];
      return{...prev,[shiftMem.id]:mm};
    });
    setMode("view");
  }
  function saveEvent(){
    if(!evForm.title)return;
    const ev={id:Date.now(),title:evForm.title,timeS:evForm.timeS,timeE:evForm.timeE,place:evForm.place,memberId:evForm.memberId?+evForm.memberId:null};
    setEvents(p=>({...p,[selected]:[...(p[selected]||[]),ev]}));
    setEvForm({title:"",timeS:"",timeE:"",place:"",memberId:""});
    setMode("view");
  }

  const selEvs=events[selected]||[];
  const selHD=HOLIDAYS[selected]||"";
  const selShift=defShift(selected);
  const selST=selShift?shiftTypes[selShift]:null;

  const annivSet=new Set();
  anniv.filter(a=>a.showCalendar!==false).forEach(a=>{const mo=(a.isLunar?a.solarMonth:a.month)-1;if(mo===month)annivSet.add(a.isLunar?a.solarDay:a.day);});

  return(
    <div style={{height:"100%",overflowY:"auto",paddingBottom:80}}>
      <div style={{background:"linear-gradient(150deg,#38BDF8,#818CF8)",padding:"14px 16px 12px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <button onClick={()=>dispYM({type:"PREV"})} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",width:32,height:32,borderRadius:9,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <span style={{color:"#fff",fontSize:17,fontWeight:800}}>{year}년 {MONTHS_KO[month]}</span>
          <button onClick={()=>dispYM({type:"NEXT"})} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",width:32,height:32,borderRadius:9,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:C.gray50,padding:"3px 6px 2px"}}>
        {DAYS_KO.map((d,i)=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:800,color:i===0?"#EF4444":i===6?"#3B82F6":C.gray400}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:C.gray50,padding:"2px 6px 6px",gap:2}}>
        {cells.map((day,idx)=>{
          if(!day)return<div key={"e"+idx}/>;
          const ds=mkDs(year,month,day);
          const dayEvs=events[ds]||[];
          const isSel=selected===ds,isToday=ds===TODAY,dow=(fd+day-1)%7;
          const isHD=!!HOLIDAYS[ds],hasA=annivSet.has(day);
          const ds2=defShift(ds);const dsST=ds2?shiftTypes[ds2]:null;
          return(
            <div key={"d"+day} onClick={()=>setSelected(ds)} style={{borderRadius:8,cursor:"pointer",minHeight:50,padding:"4px 2px 3px",background:isSel?"linear-gradient(135deg,#38BDF8,#818CF8)":isToday?C.skyBg:C.white,border:isToday&&!isSel?`1.5px solid ${C.sky}`:"1px solid transparent"}}>
              <div style={{textAlign:"center",fontSize:12,marginBottom:1,fontWeight:isSel||isToday?900:500,color:isSel?"#fff":isHD||dow===0?"#EF4444":dow===6?"#3B82F6":isToday?C.skyDeep:C.gray800}}>{day}</div>
              {dsST&&!isSel&&<div style={{textAlign:"center",marginBottom:1}}><span style={{fontSize:8,fontWeight:800,background:dsST.bg,color:dsST.color,borderRadius:3,padding:"0 3px",lineHeight:"12px",display:"inline-block"}}>{shiftLabel(dsST)}</span></div>}
              <div style={{display:"flex",flexWrap:"wrap",gap:2,justifyContent:"center"}}>
                {isHD&&<div style={{width:4,height:4,borderRadius:"50%",background:C.red}}/>}
                {hasA&&<div style={{width:4,height:4,borderRadius:"50%",background:C.amber}}/>}
                {dayEvs.slice(0,2).map((ev,j)=>{const m2=members.find(x=>x.id===ev.memberId);return<div key={j} style={{width:4,height:4,borderRadius:"50%",background:m2?m2.color:C.gray400,opacity:isSel?0.7:1}}/>;})}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{padding:"10px 14px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div>
            <span style={{fontSize:13,fontWeight:800,color:C.gray800}}>{new Date(selected+"T00:00:00").getDate()}일</span>
            {selHD&&<span style={{marginLeft:6,fontSize:11,color:C.red,fontWeight:700}}>🎌 {selHD}</span>}
            {selST&&<span style={{marginLeft:6,fontSize:11,fontWeight:800,color:selST.color,background:selST.bg,borderRadius:8,padding:"1px 7px"}}>{shiftMem?.name} {shiftLabel(selST)}</span>}
          </div>
          <div style={{display:"flex",gap:6}}>
            {shiftMem&&<button onClick={()=>setMode(mode==="addShift"?"view":"addShift")} style={{padding:"4px 10px",borderRadius:20,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:mode==="addShift"?C.violet:C.violetBg,color:mode==="addShift"?"#fff":C.violetDeep}}>{getZ(shiftMem.zodiac).e} 근무</button>}
            <button onClick={()=>setMode(mode==="addEvent"?"view":"addEvent")} style={{width:28,height:28,borderRadius:"50%",border:"none",cursor:"pointer",background:"linear-gradient(135deg,#38BDF8,#818CF8)",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          </div>
        </div>

        {mode==="addShift"&&(
          <div style={{background:C.white,borderRadius:14,padding:14,marginBottom:10,boxShadow:"0 3px 14px rgba(0,0,0,0.08)",border:`1.5px solid ${C.violet}`}}>
            <p style={{margin:"0 0 4px",fontSize:13,fontWeight:800,color:C.gray800}}>{getZ(shiftMem?.zodiac||"rabbit").e} {shiftMem?.name} 근무 입력</p>
            <p style={{margin:"0 0 12px",fontSize:11,color:C.gray400}}>선택 후 자동으로 다음 날 이동</p>
            {selST&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:C.gray50,borderRadius:12,padding:"9px 10px",marginBottom:10}}>
                <span style={{fontSize:12,fontWeight:800,color:C.gray600}}>현재 {shiftLabel(selST)} · {selST.time}</span>
                <button onClick={deleteSelectedShift} style={{border:"none",background:C.redBg,color:C.red,borderRadius:10,padding:"6px 9px",fontSize:11,fontWeight:900,cursor:"pointer"}}>삭제</button>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {Object.entries(shiftTypes).filter(([,v])=>v.enabled!==false).map(([k,v])=>(
                <button key={k} onClick={()=>selectShift(k)} style={{padding:"10px 0",borderRadius:12,border:"none",background:v.bg,cursor:"pointer",textAlign:"center"}}>
                  <p style={{margin:0,fontSize:18,fontWeight:900,color:v.color,lineHeight:1}}>{shiftLabel(v)}</p>
                  <p style={{margin:"2px 0 0",fontSize:8,color:v.color,opacity:0.7}}>{v.time}</p>
                </button>
              ))}
            </div>
            <button onClick={()=>setMode("view")} style={{width:"100%",padding:9,marginTop:10,borderRadius:10,background:C.gray100,border:"none",color:C.gray600,fontSize:12,cursor:"pointer"}}>완료</button>
          </div>
        )}
        {mode==="addEvent"&&(
          <div style={{background:C.white,borderRadius:14,padding:14,marginBottom:10,boxShadow:"0 3px 14px rgba(0,0,0,0.08)",border:`1.5px solid ${C.sky}`}}>
            <p style={{margin:"0 0 10px",fontSize:13,fontWeight:800,color:C.gray800}}>일정 추가</p>
            <input value={evForm.title} onChange={e=>setEvForm(p=>({...p,title:e.target.value}))} placeholder="일정 제목" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:8,boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div><label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:3}}>시작</label><input type="time" value={evForm.timeS} onChange={e=>setEvForm(p=>({...p,timeS:e.target.value}))} style={{width:"100%",padding:"8px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/></div>
              <div><label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:3}}>종료 <span style={{color:C.gray400,fontWeight:400}}>(선택)</span></label><input type="time" value={evForm.timeE} onChange={e=>setEvForm(p=>({...p,timeE:e.target.value}))} style={{width:"100%",padding:"8px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/></div>
            </div>
            <input value={evForm.place} onChange={e=>setEvForm(p=>({...p,place:e.target.value}))} placeholder="장소 (선택)" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:8,boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {members.map(m=>{const z=getZ(m.zodiac);const sel=evForm.memberId===String(m.id);return(<button key={m.id} onClick={()=>setEvForm(p=>({...p,memberId:sel?"":String(m.id)}))} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,border:`1.5px solid ${sel?m.color:C.gray200}`,background:sel?m.bg:C.white,color:sel?m.deep:C.gray600,fontSize:11,fontWeight:700,cursor:"pointer"}}><span>{z.e}</span>{m.name}</button>);})}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setMode("view")} style={{flex:1,padding:10,borderRadius:10,background:C.gray100,border:"none",color:C.gray600,fontSize:12,fontWeight:700,cursor:"pointer"}}>취소</button>
              <button onClick={saveEvent} style={{flex:2,padding:10,borderRadius:10,background:evForm.title?"linear-gradient(135deg,#38BDF8,#818CF8)":C.gray200,border:"none",color:evForm.title?"#fff":C.gray400,fontSize:12,fontWeight:800,cursor:evForm.title?"pointer":"not-allowed"}}>저장</button>
            </div>
          </div>
        )}
        {selEvs.length===0&&mode==="view"
          ?<div style={{background:C.gray50,borderRadius:12,padding:16,textAlign:"center",color:C.gray400,fontSize:13}}>일정 없음 🌱</div>
          :selEvs.map((ev,i)=>{const m=members.find(x=>x.id===ev.memberId);const ts=ev.timeS?(ev.timeE?`${ev.timeS}~${ev.timeE}`:ev.timeS):"종일";return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",marginBottom:6,background:C.white,borderRadius:12,borderLeft:`3px solid ${m?m.color:C.gray200}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:13,fontWeight:700,color:C.gray800}}>{ev.title}</span>{ev.isRoutine&&<Tag label="루틴" color={m?.deep||C.gray600} bg={m?.bg||C.gray100}/>}</div><span style={{fontSize:11,color:C.gray400}}>{ts}{ev.place?` · ${ev.place}`:""}</span></div>
              {m&&<ZBadge member={m} size={28} bordered={false}/>}
            </div>
          );})}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   TODO SCREEN
════════════════════════════════════════ */
function TodoScreen({members,todos,setTodos}){
  const [subTab,setSubTab]=useState("today");
  const [input,setInput]=useState("");
  const [celebration,setCelebration]=useState(null);
  const [quickMember,setQuickMember]=useState("");
  const [showDone,setShowDone]=useState(false);
  const [sheet,setSheet]=useState(null);
  const [editForm,setEditForm]=useState({});
  const done=todos.filter(t=>t.done);
  const active=todos.filter(t=>!t.done&&!t.disabled);
  const todayAll=active.filter(t=>!t.skipped&&(t.due==="오늘"||t.isRoutine||!t.due));
  const upcoming=active.filter(t=>!t.skipped&&!t.isRoutine&&t.due&&t.due!=="오늘");
  const routineList=active.filter(t=>t.isRoutine&&!t.skipped);
  const visible=subTab==="today"?todayAll:subTab==="upcoming"?upcoming:subTab==="routine"?routineList:done;
  const familyOrder=members;
  const add=()=>{
    if(!input.trim())return;
    setTodos(p=>[...p,{
      id:Date.now(),text:input.trim(),done:false,
      memberId:quickMember?+quickMember:null,isRoutine:false,due:"오늘",
    }]);
    setInput("");
  };
  function triggerCelebration(){
    const id=Date.now();
    setCelebration(id);
    setTimeout(()=>setCelebration(null),1250);
  }
  const complete=id=>{
    const target=todos.find(t=>t.id===id);
    if(target&&!target.done)triggerCelebration();
    setTodos(p=>p.map(t=>t.id===id?{...t,done:true}:t));
    setSheet(null);
  };
  const toggle=id=>{
    const target=todos.find(t=>t.id===id);
    if(target&&!target.done)triggerCelebration();
    setTodos(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));
  };
  const del=id=>{setTodos(p=>p.filter(t=>t.id!==id));setSheet(null);};
  const postpone=id=>{setTodos(p=>p.map(t=>t.id===id?{...t,due:"내일",skipped:false}:t));setSheet(null);};
  const skipRoutine=id=>{setTodos(p=>p.map(t=>t.id===id?{...t,skipped:true}:t));setSheet(null);};
  const disableRoutine=id=>{setTodos(p=>p.map(t=>t.id===id?{...t,disabled:true}:t));setSheet(null);};
  function openEdit(todo){
    setEditForm({
      id:todo.id,text:todo.text,memberId:todo.memberId?String(todo.memberId):"",
      due:todo.due||"오늘",isRoutine:!!todo.isRoutine,
      repeatDays:parseRepeatDays(todo.repeat,todo.repeatDays),
      alert:!!todo.alert,
    });
    setSheet({type:"edit",id:todo.id});
  }
  function saveEdit(){
    const repeat=editForm.repeatDays?.length?formatRepeatDays(editForm.repeatDays):"요일 선택";
    setTodos(p=>p.map(t=>t.id===editForm.id?{
      ...t,text:editForm.text.trim(),memberId:editForm.memberId?+editForm.memberId:null,
      isRoutine:editForm.isRoutine,due:editForm.isRoutine?undefined:editForm.due,
      repeat:editForm.isRoutine?repeat:undefined,repeatDays:editForm.isRoutine?editForm.repeatDays:undefined,
      alert:editForm.alert,
    }:t));
    setSheet(null);
  }
  const metaText=t=>{
    const m=members.find(x=>x.id===t.memberId);
    const owner=m?m.name:"담당자 없음";
    if(t.isRoutine)return`${owner} · ${t.repeat||"반복 요일 없음"}`;
    return`${owner} · ${t.due||"마감 없음"}`;
  };
  function TodoCard(t,doneView=false){
    const m=members.find(x=>x.id===t.memberId);const z=m?getZ(m.zodiac):null;
    return(
      <div key={t.id} onClick={()=>setSheet({type:"detail",id:t.id})} style={{background:t.isRoutine&&!doneView?C.violetBg:C.white,borderRadius:13,padding:"11px 13px",display:"flex",alignItems:"center",gap:10,marginBottom:7,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",cursor:"pointer",opacity:doneView?0.62:1}}>
        <button onClick={e=>{e.stopPropagation();toggle(t.id);}} style={{width:24,height:24,borderRadius:"50%",border:doneView?"none":`2px solid ${t.isRoutine?C.violet:C.gray200}`,background:doneView?C.mint:"none",color:"#fff",cursor:"pointer",flexShrink:0,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>{doneView?"✓":""}</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
            <span style={{fontSize:13,fontWeight:800,color:doneView?C.gray400:C.gray800,textDecoration:doneView?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.text}</span>
            {t.isRoutine&&<Tag label="루틴" color={C.violetDeep} bg="rgba(129,140,248,0.2)"/>}
            {t.alert&&<Tag label="알림" color={C.amberDeep} bg={C.amberBg}/>}
          </div>
          <p style={{margin:0,fontSize:11,color:doneView?C.gray400:C.gray400}}>{metaText(t)}</p>
        </div>
        {z&&<span style={{fontSize:16,flexShrink:0}}>{z.e}</span>}
        <span style={{fontSize:18,color:C.gray200,flexShrink:0}}>›</span>
      </div>
    );
  }
  function EmptyState(){
    const label=subTab==="today"?"오늘 할 일이 없어요":subTab==="upcoming"?"예정된 할 일이 없어요":subTab==="routine"?"켜진 루틴이 없어요":"완료된 할 일이 없어요";
    return <div style={{background:C.white,borderRadius:16,padding:"28px 16px",textAlign:"center",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",color:C.gray400,fontSize:13,fontWeight:800}}>{label}</div>;
  }
  function DetailSheet(){
    const todo=todos.find(x=>x.id===sheet?.id);
    if(!todo)return null;
    const m=members.find(x=>x.id===todo.memberId);
    return(<>
      <div style={{background:C.gray50,borderRadius:14,padding:"12px 14px",marginBottom:12}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
          <p style={{margin:0,fontSize:15,fontWeight:900,color:C.gray800}}>{todo.text}</p>
          {todo.isRoutine&&<Tag label="루틴" color={C.violetDeep} bg={C.violetBg}/>}
        </div>
        <p style={{margin:0,fontSize:12,color:C.gray400}}>{m?`${getZ(m.zodiac).e} ${m.name}`:"담당자 없음"} · {todo.isRoutine?todo.repeat||"반복 없음":todo.due||"마감 없음"}</p>
      </div>
      {!todo.done&&<Btn label="✅ 완료" color={C.mintDeep} bg={C.mintBg} full onClick={()=>complete(todo.id)}/>}
      {todo.isRoutine?(
        <>
          <Btn label="⏭ 오늘만 건너뛰기" color={C.skyDeep} bg={C.skyBg} full onClick={()=>skipRoutine(todo.id)}/>
          <Btn label="🔁 반복 수정" color={C.violetDeep} bg={C.violetBg} full onClick={()=>openEdit(todo)}/>
          <Btn label="🔕 루틴 끄기" color={C.gray600} bg={C.gray100} full onClick={()=>disableRoutine(todo.id)}/>
        </>
      ):(
        <>
          <Btn label="✏️ 수정" color={C.skyDeep} bg={C.skyBg} full onClick={()=>openEdit(todo)}/>
          <Btn label="👤 담당자 변경" color={C.violetDeep} bg={C.violetBg} full onClick={()=>openEdit(todo)}/>
          <Btn label="📅 내일로 미루기" color={C.amberDeep} bg={C.amberBg} full onClick={()=>postpone(todo.id)}/>
        </>
      )}
      <Btn label="🗑 삭제" color={C.red} bg={C.redBg} full onClick={()=>del(todo.id)}/>
    </>);
  }
  function EditSheet(){
    return(<>
      <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>제목</label>
      <input value={editForm.text||""} onChange={e=>setEditForm(p=>({...p,text:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:14,outline:"none",marginBottom:10,fontFamily:"inherit",boxSizing:"border-box"}}/>
      <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>담당자</label>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        <button onClick={()=>setEditForm(p=>({...p,memberId:""}))} style={{padding:"5px 10px",borderRadius:20,border:`1.5px solid ${!editForm.memberId?C.sky:C.gray200}`,background:!editForm.memberId?C.skyBg:C.white,color:!editForm.memberId?C.skyDeep:C.gray600,fontSize:11,fontWeight:800,cursor:"pointer"}}>없음</button>
        {members.map(m=>{const sel=String(editForm.memberId)===String(m.id);return <button key={m.id} onClick={()=>setEditForm(p=>({...p,memberId:String(m.id)}))} style={{padding:"5px 10px",borderRadius:20,border:`1.5px solid ${sel?m.color:C.gray200}`,background:sel?m.bg:C.white,color:sel?m.deep:C.gray600,fontSize:11,fontWeight:800,cursor:"pointer"}}>{getZ(m.zodiac).e} {m.name}</button>;})}
      </div>
      <button onClick={()=>setEditForm(p=>({...p,isRoutine:!p.isRoutine,repeatDays:p.repeatDays?.length?p.repeatDays:["월","화","수","목","금"]}))} style={{width:"100%",padding:"9px 12px",borderRadius:12,border:"1.5px solid",borderColor:editForm.isRoutine?C.violet:C.gray200,background:editForm.isRoutine?C.violetBg:C.gray50,color:editForm.isRoutine?C.violetDeep:C.gray600,fontSize:12,fontWeight:900,cursor:"pointer",marginBottom:10,textAlign:"left"}}>루틴 {editForm.isRoutine?"ON":"OFF"}</button>
      {editForm.isRoutine?(
        <>
          <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>반복 요일</label>
          <RepeatDayPicker days={editForm.repeatDays||[]} onChange={days=>setEditForm(p=>({...p,repeatDays:days}))}/>
        </>
      ):(
        <>
          <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>마감</label>
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            {["오늘","내일","이번 주","날짜 없음"].map(v=><button key={v} onClick={()=>setEditForm(p=>({...p,due:v==="날짜 없음"?"":v}))} style={{padding:"6px 10px",borderRadius:20,border:"1.5px solid",borderColor:(editForm.due||"날짜 없음")===v?C.mint:C.gray200,background:(editForm.due||"날짜 없음")===v?C.mintBg:C.white,color:(editForm.due||"날짜 없음")===v?C.mintDeep:C.gray600,fontSize:11,fontWeight:800,cursor:"pointer"}}>{v}</button>)}
          </div>
        </>
      )}
      <button onClick={()=>setEditForm(p=>({...p,alert:!p.alert}))} style={{width:"100%",padding:"9px 12px",borderRadius:12,border:"1.5px solid",borderColor:editForm.alert?C.amber:C.gray200,background:editForm.alert?C.amberBg:C.gray50,color:editForm.alert?C.amberDeep:C.gray600,fontSize:12,fontWeight:900,cursor:"pointer",marginBottom:12,textAlign:"left"}}>알림 {editForm.alert?"ON":"OFF"}</button>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setSheet(null)} style={{flex:1,padding:10,borderRadius:12,background:C.gray100,border:"none",color:C.gray600,fontSize:13,fontWeight:700,cursor:"pointer"}}>취소</button>
        <button onClick={saveEdit} disabled={!editForm.text?.trim()} style={{flex:2,padding:10,borderRadius:12,background:editForm.text?.trim()?"linear-gradient(135deg,#4ADE80,#38BDF8)":C.gray200,border:"none",color:editForm.text?.trim()?"#fff":C.gray400,fontSize:13,fontWeight:800,cursor:editForm.text?.trim()?"pointer":"not-allowed"}}>저장</button>
      </div>
    </>);
  }

  return(
    <div style={{height:"100%",overflowY:"auto",paddingBottom:80,position:"relative"}}>
      <FireworkBurst burst={celebration}/>
      <Sheet open={!!sheet} onClose={()=>setSheet(null)} title={sheet?.type==="edit"?"할 일 수정":"할 일 상세"}>
        {sheet?.type==="detail"&&DetailSheet()}
        {sheet?.type==="edit"&&EditSheet()}
      </Sheet>
      <div style={{background:"linear-gradient(150deg,#4ADE80,#38BDF8)",padding:"16px 18px 18px"}}>
        <h3 style={{color:"#fff",margin:"0 0 12px",fontSize:18,fontWeight:800}}>할 일 · 루틴</h3>
        <div style={{display:"flex",gap:6}}>
          {[{id:"today",l:"오늘"},{id:"upcoming",l:"예정"},{id:"routine",l:"루틴"},{id:"done",l:"완료"}].map(t=>(
            <button key={t.id} onClick={()=>setSubTab(t.id)} style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid",borderColor:subTab===t.id?"#fff":"rgba(255,255,255,0.4)",background:subTab===t.id?"rgba(255,255,255,0.25)":"transparent",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t.l}</button>
          ))}
        </div>
      </div>
      <div style={{padding:14}}>
        <div style={{display:"flex",gap:8,marginBottom:12,background:C.white,borderRadius:16,padding:"12px 14px",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",alignItems:"center"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="새 할 일 추가..." style={{flex:1,border:"none",outline:"none",fontSize:13,background:"transparent",fontFamily:"inherit"}}/>
          <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
            {familyOrder.map(m=>{
              const sel=quickMember===String(m.id);
              return(
                <button key={m.id} onClick={()=>setQuickMember(sel?"":String(m.id))} title={m.name} style={{
                  width:24,height:24,borderRadius:"50%",border:`1.5px solid ${sel?m.color:C.gray200}`,
                  background:sel?m.bg:C.white,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:15,lineHeight:1,padding:0,boxShadow:sel?`0 0 0 2px ${m.bg}`:"none",
                }}>{getZ(m.zodiac).e}</button>
              );
            })}
          </div>
          <button onClick={add} style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#4ADE80,#38BDF8)",border:"none",color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
        </div>
        {visible.length?visible.map(t=>TodoCard(t,subTab==="done")):<EmptyState/>}
        {subTab==="today"&&done.length>0&&(
          <>
            <button onClick={()=>setShowDone(v=>!v)} style={{width:"100%",padding:"8px 2px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:C.gray400,fontSize:12,fontWeight:800}}>
              <span>{showDone?"▼":"▶"}</span><span>완료 {done.length}개</span>
            </button>
            {showDone&&done.map(t=>TodoCard(t,true))}
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   ANNIV SCREEN (기준일 + 나이/주년 계산)
════════════════════════════════════════ */
function AnnivScreen({members,anniv,setAnniv,embedded=false,onBack}){
  const list=anniv;
  const [show,setShow]=useState(false);
  const [sheet,setSheet]=useState(null);
  const emptyForm={label:"",type:"birthday",isLunar:false,month:"",day:"",birthYear:"",startYear:"",relation:"",alerts:["7일 전","1일 전","당일"],showHome:true,showCalendar:true,hideAge:false};
  const [form,setForm]=useState(emptyForm);
  const enriched=list.map(a=>{
    const dd=calcDday(a.isLunar?a.solarMonth:a.month,a.isLunar?a.solarDay:a.day);
    const sub=annivSubtitle(a,dd,members);
    return{...a,...dd,sub};
  }).sort((a,b)=>a.diff-b.diff);

  const save=()=>{
    if(!form.label||!form.month||!form.day)return;
    setAnniv(p=>[...p,{
      id:Date.now(),label:form.label.trim(),type:form.type,isLunar:form.isLunar,
      month:+form.month,day:+form.day,
      solarMonth:+form.month,solarDay:+form.day,
      birthYear:form.birthYear?+form.birthYear:undefined,
      startYear:form.startYear?+form.startYear:undefined,
      relation:form.relation||undefined,memberId:null,source:"manual",
      alerts:form.alerts,showHome:form.showHome,showCalendar:form.showCalendar,hideAge:form.hideAge,
    }]);
    setForm(emptyForm);
    setShow(false);
  };
  function openEdit(a){
    setForm({
      label:a.label,type:a.type,isLunar:a.isLunar,month:String(a.month),day:String(a.day),
      birthYear:a.birthYear?String(a.birthYear):"",startYear:a.startYear?String(a.startYear):"",
      relation:a.relation||"",alerts:a.alerts||["7일 전","1일 전","당일"],
      showHome:a.showHome!==false,showCalendar:a.showCalendar!==false,hideAge:!!a.hideAge,
      id:a.id,source:a.source,memberId:a.memberId,
    });
    setSheet({type:"edit",data:a});
  }
  function saveEdit(){
    if(!form.label||!form.month||!form.day)return;
    const updated={
      ...(anniv.find(a=>a.id===form.id)||{}),
      label:form.label.trim(),type:form.type,isLunar:form.isLunar,
      month:+form.month,day:+form.day,solarMonth:+form.month,solarDay:+form.day,
      birthYear:form.birthYear?+form.birthYear:undefined,
      startYear:form.startYear?+form.startYear:undefined,
      relation:form.relation||undefined,alerts:form.alerts,
      showHome:form.showHome,showCalendar:form.showCalendar,hideAge:form.hideAge,
    };
    setAnniv(p=>p.map(a=>a.id===form.id?updated:a));
    setSheet({type:"detail",data:updated});
    setForm(emptyForm);
  }
  function toggleAlert(v){
    setForm(p=>({ ...p, alerts:p.alerts.includes(v)?p.alerts.filter(x=>x!==v):[...p.alerts,v] }));
  }
  function toggleVisibility(a){
    const visible=!(a.showHome===false&&a.showCalendar===false);
    setAnniv(p=>p.map(x=>x.id===a.id?{...x,showHome:!visible,showCalendar:!visible}:x));
    setSheet({type:"detail",data:{...a,showHome:!visible,showCalendar:!visible}});
  }
  function deleteAnniv(a){
    if(a.source==="auto")return;
    setAnniv(p=>p.filter(x=>x.id!==a.id));
    setSheet(null);
  }
  function AnnivForm({editing=false}){
    return(<>
      {editing&&form.source==="auto"&&<div style={{background:C.skyBg,borderRadius:12,padding:"10px 12px",marginBottom:10}}>
        <p style={{margin:0,fontSize:12,fontWeight:800,color:C.skyDeep}}>자동 생성됨</p>
        <p style={{margin:"2px 0 0",fontSize:11,color:C.skyDeep}}>생년월일은 가족 멤버 정보에서 수정하는 흐름이 자연스럽습니다.</p>
      </div>}
      <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>타입</label>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["birthday","생일 🎂"],["anniversary","기념일 💍"],["relative","관계 인물 👴"],["baby","아기 성장 👶"]].map(([v,l])=>(
          <button key={v} onClick={()=>setForm(p=>({...p,type:v}))} style={{padding:"5px 10px",borderRadius:20,border:"1.5px solid",borderColor:form.type===v?C.amber:C.gray200,background:form.type===v?C.amberBg:C.white,color:form.type===v?C.amberDeep:C.gray600,fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>이름</label>
      <input value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="예) 민준 생일" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box",fontFamily:"inherit"}}/>
      {form.type==="relative"&&<><label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>관계</label><input value={form.relation} onChange={e=>setForm(p=>({...p,relation:e.target.value}))} placeholder="예) 외할머니" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box",fontFamily:"inherit"}}/></>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.gray50,borderRadius:12,padding:"9px 14px",marginBottom:10}}>
        <div><p style={{margin:0,fontSize:13,fontWeight:700,color:C.gray800}}>음력 날짜</p><p style={{margin:"1px 0 0",fontSize:11,color:C.gray400}}>음력 원일과 올해 양력일을 함께 표시</p></div>
        <button onClick={()=>setForm(p=>({...p,isLunar:!p.isLunar}))} style={{width:42,height:24,borderRadius:12,border:"none",background:form.isLunar?C.violet:C.gray200,cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
          <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:form.isLunar?20:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
        </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        {["월","일"].map((lbl,i)=>(
          <div key={lbl}><label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:3}}>{form.isLunar?`음력 ${lbl}`:lbl}</label>
          <input type="number" min="1" max={i===0?12:31} value={i===0?form.month:form.day}
            onChange={e=>setForm(p=>i===0?{...p,month:e.target.value}:{...p,day:e.target.value})}
            placeholder={i===0?"6":"1"} style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/></div>
        ))}
      </div>
      {(form.type==="birthday"||form.type==="relative"||form.type==="baby")&&(
        <><label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>생년 (나이 계산용)</label>
        <input type="number" value={form.birthYear} onChange={e=>setForm(p=>({...p,birthYear:e.target.value}))} placeholder="예) 2021" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box",fontFamily:"inherit"}}/></>
      )}
      {form.type==="anniversary"&&(
        <><label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>시작 연도 (주년 계산용)</label>
        <input type="number" value={form.startYear} onChange={e=>setForm(p=>({...p,startYear:e.target.value}))} placeholder="예) 2016" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box",fontFamily:"inherit"}}/></>
      )}
      <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>알림</label>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {ALERT_PRESETS.map(v=><button key={v} onClick={()=>toggleAlert(v)} style={{padding:"5px 10px",borderRadius:20,border:"1.5px solid",borderColor:form.alerts.includes(v)?C.amber:C.gray200,background:form.alerts.includes(v)?C.amberBg:C.white,color:form.alerts.includes(v)?C.amberDeep:C.gray600,fontSize:11,fontWeight:700,cursor:"pointer"}}>{v}</button>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
        {[["showHome","홈 표시"],["showCalendar","달력 표시"],["hideAge","나이 숨김"]].map(([k,l])=><button key={k} onClick={()=>setForm(p=>({...p,[k]:!p[k]}))} style={{padding:"8px 6px",borderRadius:10,border:"1.5px solid",borderColor:form[k]?C.amber:C.gray200,background:form[k]?C.amberBg:C.white,color:form[k]?C.amberDeep:C.gray600,fontSize:11,fontWeight:800,cursor:"pointer"}}>{l}</button>)}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>editing?setSheet({type:"detail",data:sheet.data}):setShow(false)} style={{flex:1,padding:10,borderRadius:12,background:C.gray100,border:"none",color:C.gray600,fontSize:13,fontWeight:700,cursor:"pointer"}}>취소</button>
        <button onClick={editing?saveEdit:save} style={{flex:2,padding:10,borderRadius:12,background:(form.label&&form.month&&form.day)?"linear-gradient(135deg,#FBBF24,#FB923C)":C.gray200,border:"none",color:(form.label&&form.month&&form.day)?"#fff":C.gray400,fontSize:13,fontWeight:800,cursor:(form.label&&form.month&&form.day)?"pointer":"not-allowed"}}>{editing?"저장":"추가"}</button>
      </div>
    </>);
  }
  function AnnivDetail({a}){
    const latest=anniv.find(x=>x.id===a.id)||a;
    const dd=calcDday(latest.isLunar?latest.solarMonth:latest.month,latest.isLunar?latest.solarDay:latest.day);
    const sub=annivSubtitle(latest,dd,members);
    const hidden=latest.showHome===false&&latest.showCalendar===false;
    return(<>
      <div style={{background:C.gray50,borderRadius:14,padding:"12px 14px",marginBottom:12}}>
        <p style={{margin:"0 0 4px",fontSize:15,fontWeight:900,color:C.gray800}}>{latest.label}</p>
        {sub&&<p style={{margin:"0 0 2px",fontSize:12,fontWeight:700,color:C.amberDeep}}>{sub}</p>}
        {annivLunarLine(latest)&&<p style={{margin:"2px 0 0",fontSize:12,color:C.violetDeep}}>{annivLunarLine(latest)}</p>}
        <p style={{margin:"4px 0 0",fontSize:11,color:C.gray400}}>{annivSourceLabel(latest)} · 알림 {(latest.alerts||[]).join(", ")||"없음"}</p>
      </div>
      <Btn label="✏️ 수정" color={C.skyDeep} bg={C.skyBg} full onClick={()=>openEdit(latest)}/>
      <Btn label="🔔 알림 변경" color={C.amberDeep} bg={C.amberBg} full onClick={()=>openEdit(latest)}/>
      {latest.source==="auto"&&<Btn label="👤 멤버 정보에서 수정" color={C.violetDeep} bg={C.violetBg} full onClick={()=>setSheet(null)}/>}
      <Btn label={hidden?"🏠 홈/달력에 다시 표시":"🙈 홈/달력에서 숨기기"} color={C.gray600} bg={C.gray100} full onClick={()=>toggleVisibility(latest)}/>
      {latest.source==="auto"
        ?<p style={{fontSize:11,color:C.gray400,margin:"4px 0 0"}}>자동 생성 생일은 삭제 대신 숨기기를 사용합니다.</p>
        :<Btn label="🗑 삭제" color={C.red} bg={C.redBg} full onClick={()=>deleteAnniv(latest)}/>}
    </>);
  }

  return(
    <div style={{height:"100%",overflowY:"auto",paddingBottom:embedded?10:80}}>
      <Sheet open={!!sheet} onClose={()=>setSheet(null)} title={sheet?.type==="edit"?"기념일 수정":"기념일 상세"}>
        {sheet?.type==="detail"&&AnnivDetail({a:sheet.data})}
        {sheet?.type==="edit"&&AnnivForm({editing:true})}
      </Sheet>
      {embedded&&onBack&&<div style={{padding:"14px 14px 0"}}><button onClick={onBack} style={{background:"none",border:"none",color:C.sky,fontSize:13,fontWeight:700,cursor:"pointer",padding:0}}>← 뒤로</button></div>}
      <div style={{background:embedded?C.white:"linear-gradient(150deg,#FBBF24,#FB923C)",padding:embedded?"14px 14px 8px":"18px 18px 20px",borderRadius:embedded?16:0,margin:embedded?"12px 14px 0":0}}>
        <h3 style={{color:embedded?C.gray800:"#fff",margin:"0 0 2px",fontSize:18,fontWeight:800}}>기념일 관리</h3>
        <p style={{color:embedded?C.gray400:"rgba(255,255,255,0.75)",margin:"0 0 12px",fontSize:12}}>생일·기념일·만난 날 — D-day + 나이·주년 자동 계산</p>
        <div style={{display:"flex",gap:10}}>
          {[{l:"전체",v:list.length},{l:"D-30 이내",v:enriched.filter(a=>a.diff<=30).length}].map((s,i)=>(
            <div key={i} style={{background:embedded?C.amberBg:"rgba(255,255,255,0.2)",borderRadius:10,padding:"8px 16px",textAlign:"center",minWidth:70}}>
              <p style={{margin:0,color:embedded?C.amberDeep:"#fff",fontSize:22,fontWeight:900,lineHeight:1}}>{s.v}</p>
              <p style={{margin:"4px 0 0",color:embedded?C.amberDeep:"rgba(255,255,255,0.75)",fontSize:10}}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:14}}>
        {!show&&<button onClick={()=>setShow(true)} style={{width:"100%",padding:13,borderRadius:14,background:"linear-gradient(135deg,#FBBF24,#FB923C)",border:"none",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:14,boxShadow:"0 4px 14px rgba(251,191,36,0.35)"}}>+ 기념일 추가</button>}
        {show&&(
          <div style={{background:C.white,borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:`1.5px solid ${C.amber}`}}>
            <p style={{margin:"0 0 12px",fontSize:14,fontWeight:800,color:C.gray800}}>새 기념일</p>
            <p style={{margin:"-6px 0 12px",fontSize:11,color:C.gray400}}>빠르게 추가하고, 전체 수정·정리·숨김은 이 화면에서 관리합니다.</p>
            {AnnivForm()}
          </div>
        )}
        {enriched.map(a=>{
          const urgent=a.diff>=0&&a.diff<=7;
          const dLabel=a.diff===0?"🎉 오늘":a.diff<0?`D+${Math.abs(a.diff)}`:`D-${a.diff}`;
          const typeLabel=a.type==="birthday"?"생일":a.type==="anniversary"?"기념일":a.type==="baby"?"아기성장":"관계";
          const typeC=a.type==="birthday"?{c:C.roseDeep,bg:C.roseBg}:a.type==="anniversary"?{c:C.amberDeep,bg:C.amberBg}:{c:C.violetDeep,bg:C.violetBg};
          return(
            <div key={a.id} onClick={()=>setSheet({type:"detail",data:a})} style={{background:C.white,borderRadius:14,padding:"13px 14px",marginBottom:8,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`3px solid ${urgent?C.amber:C.gray200}`,cursor:"pointer",opacity:(a.showHome===false&&a.showCalendar===false)?0.62:1}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <div style={{width:44,height:44,borderRadius:12,flexShrink:0,background:urgent?C.amberBg:C.gray50,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:800,color:urgent?C.amberDeep:C.gray400}}>{MONTHS_KO[(a.isLunar?a.solarMonth:a.month)-1]}</span>
                  <span style={{fontSize:16,fontWeight:900,lineHeight:1,color:urgent?C.amberDeep:C.gray800}}>{a.isLunar?a.solarDay:a.day}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",marginBottom:3}}>
                    <span style={{fontSize:14,fontWeight:800,color:C.gray800}}>{a.label}</span>
                    <Tag label={typeLabel} color={typeC.c} bg={typeC.bg}/>
                    {a.isLunar&&<Tag label="음력" color={C.violetDeep} bg={C.violetBg}/>}
                    <Tag label={annivSourceLabel(a)} color={a.source==="auto"?C.skyDeep:C.gray600} bg={a.source==="auto"?C.skyBg:C.gray100}/>
                    {(a.showHome===false&&a.showCalendar===false)&&<Tag label="숨김" color={C.gray600} bg={C.gray100}/>}
                  </div>
                  {/* 나이/주년 서브타이틀 */}
                  {a.sub&&<p style={{margin:0,fontSize:12,color:urgent?C.amberDeep:C.gray400,fontWeight:600}}>{a.sub}</p>}
                  {annivLunarLine(a)&&<p style={{margin:"1px 0 0",fontSize:11,color:C.violetDeep}}>{annivLunarLine(a)}</p>}
                  {a.relation&&<p style={{margin:"1px 0 0",fontSize:11,color:C.gray400}}>{a.relation}</p>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <span style={{fontSize:13,fontWeight:900,color:urgent?C.amberDeep:C.gray400}}>{dLabel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   QUICK ADD SCREEN
════════════════════════════════════════ */
function AddScreen({members,setEvents,setTodos,anniv,setAnniv,shiftTypes,shiftMap,setShiftMap,goTab}){
  const [kind,setKind]=useState("event");
  const [form,setForm]=useState({title:"",date:TODAY,timeS:"",timeE:"",place:"",memberId:"",repeat:"평일",repeatDays:["월","화","수","목","금"],routineMode:"task",month:"",day:"",year:"",shiftMemberId:"",shiftKey:""});
  const shiftMembers=members.filter(m=>m.isShift);
  const activeShiftTypes=Object.entries(shiftTypes).filter(([,v])=>v.enabled!==false);
  const selectedShiftMemberId=+(form.shiftMemberId||shiftMembers[0]?.id||0);
  const existingShiftKey=selectedShiftMemberId&&form.date?(shiftMap?.[selectedShiftMemberId]||{})[form.date]:null;
  const existingShiftType=existingShiftKey?shiftTypes[existingShiftKey]:null;

  function save(){
    if((kind==="event"||kind==="todo"||kind==="routine")&&!form.title.trim())return;
    if(kind==="event"){
      const ev={id:Date.now(),title:form.title,date:form.date,timeS:form.timeS,timeE:form.timeE,place:form.place,memberId:form.memberId?+form.memberId:null};
      setEvents(p=>({...p,[form.date]:[...(p[form.date]||[]),ev]}));goTab("calendar");
    }
    if(kind==="todo"||(kind==="routine"&&form.routineMode==="task")){
      const repeat=form.repeatDays?.length?formatRepeatDays(form.repeatDays):form.repeat;
      setTodos(p=>[...p,{id:Date.now(),text:form.title,done:false,memberId:form.memberId?+form.memberId:null,due:kind==="todo"?"오늘":undefined,repeat:kind==="routine"?repeat:undefined,repeatDays:kind==="routine"?form.repeatDays:undefined,isRoutine:kind==="routine"}]);goTab("todo");
    }
    if(kind==="routine"&&form.routineMode==="event"){
      const repeat=form.repeatDays?.length?formatRepeatDays(form.repeatDays):form.repeat||"매주";
      const ev={id:Date.now(),title:form.title,date:form.date,timeS:form.timeS,timeE:form.timeE,place:form.place,memberId:form.memberId?+form.memberId:null,isRoutine:true,repeat,repeatDays:form.repeatDays};
      setEvents(p=>({...p,[form.date]:[...(p[form.date]||[]),ev]}));goTab("calendar");
    }
    if(kind==="anniv"){
      if(!form.title||!form.month||!form.day)return;
      setAnniv(p=>[...p,{id:Date.now(),label:form.title,type:"anniversary",isLunar:false,month:+form.month,day:+form.day,startYear:form.year?+form.year:undefined,source:"manual",alerts:["14일 전","7일 전","1일 전","당일"],showHome:true,showCalendar:true}]);goTab("family");
    }
    if(kind==="shift"){
      const mid=+(form.shiftMemberId||shiftMembers[0]?.id);
      const key=form.shiftKey||activeShiftTypes[0]?.[0];
      if(!mid||!key)return;
      setShiftMap(p=>({...p,[mid]:{...(p[mid]||{}),[form.date]:key}}));goTab("calendar");
    }
  }
  function deleteShiftEntry(){
    const mid=+(form.shiftMemberId||shiftMembers[0]?.id);
    if(!mid||!form.date)return;
    setShiftMap(p=>{
      const mm={...(p[mid]||{})};
      delete mm[form.date];
      return{...p,[mid]:mm};
    });
  }

  const canSave=kind==="shift"?!!(form.date&&(form.shiftMemberId||shiftMembers[0])&&(form.shiftKey||activeShiftTypes[0])):kind==="anniv"?!!(form.title&&form.month&&form.day):kind==="routine"?!!(form.title&&form.repeatDays?.length):!!form.title;

  return(
    <div style={{height:"100%",overflowY:"auto",paddingBottom:80}}>
      <div style={{background:"linear-gradient(150deg,#38BDF8,#818CF8)",padding:"18px 18px 20px"}}>
        <h3 style={{color:"#fff",margin:"0 0 4px",fontSize:18,fontWeight:800}}>등록</h3>
        <p style={{color:"rgba(255,255,255,0.75)",margin:0,fontSize:12}}>일정·할 일·루틴·기념일·근무를 한 곳에서 추가</p>
      </div>
      <div style={{padding:14}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {[["event","일정"],["todo","할 일"],["routine","루틴"],["anniv","기념일"],["shift","근무"]].map(([id,l])=>(
            <button key={id} onClick={()=>setKind(id)} style={{padding:"7px 12px",borderRadius:20,border:"1.5px solid",borderColor:kind===id?C.sky:C.gray200,background:kind===id?C.skyBg:C.white,color:kind===id?C.skyDeep:C.gray600,fontSize:12,fontWeight:800,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        <div style={{background:C.white,borderRadius:16,padding:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          {kind!=="shift"&&(
            <>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>이름</label>
              <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder={kind==="event"?"예) 가족 저녁":kind==="anniv"?"예) 결혼기념일":"예) 장보기"} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:14,outline:"none",marginBottom:10,fontFamily:"inherit"}}/>
            </>
          )}
          {kind==="routine"&&(
            <>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>루틴 종류</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[
                  {id:"task",title:"체크형",sub:"물통 챙기기, 약 먹기"},
                  {id:"event",title:"일정형",sub:"학원, 수업, 운동"}
                ].map(x=>{
                  const sel=form.routineMode===x.id;
                  return <button key={x.id} onClick={()=>setForm(p=>{
                    const days=x.id==="event"?["화","목"]:(p.repeatDays?.length?p.repeatDays:["월","화","수","목","금"]);
                    return {...p,routineMode:x.id,repeatDays:days,repeat:formatRepeatDays(days)};
                  })} style={{padding:"10px 12px",borderRadius:12,border:`1.5px solid ${sel?C.violet:C.gray200}`,background:sel?C.violetBg:C.white,textAlign:"left",cursor:"pointer"}}>
                    <p style={{margin:0,fontSize:13,fontWeight:900,color:sel?C.violetDeep:C.gray800}}>{x.title}</p>
                    <p style={{margin:"2px 0 0",fontSize:10,color:sel?C.violetDeep:C.gray400}}>{x.sub}</p>
                  </button>;
                })}
              </div>
            </>
          )}
          {(kind==="event"||kind==="shift"||(kind==="routine"&&form.routineMode==="event"))&&(
            <>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>날짜</label>
              <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,fontFamily:"inherit"}}/>
            </>
          )}
          {(kind==="event"||(kind==="routine"&&form.routineMode==="event"))&&(
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <input type="time" value={form.timeS} onChange={e=>setForm(p=>({...p,timeS:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                <input type="time" value={form.timeE} onChange={e=>setForm(p=>({...p,timeE:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <input value={form.place} onChange={e=>setForm(p=>({...p,place:e.target.value}))} placeholder="장소" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,fontFamily:"inherit"}}/>
            </>
          )}
          {(kind==="event"||kind==="todo"||kind==="routine")&&(
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {members.map(m=>{const sel=form.memberId===String(m.id);return <button key={m.id} onClick={()=>setForm(p=>({...p,memberId:sel?"":String(m.id)}))} style={{padding:"5px 10px",borderRadius:20,border:`1.5px solid ${sel?m.color:C.gray200}`,background:sel?m.bg:C.white,color:sel?m.deep:C.gray600,fontSize:11,fontWeight:700,cursor:"pointer"}}>{getZ(m.zodiac).e} {m.name}</button>;})}
            </div>
          )}
          {kind==="routine"&&(
            <>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>반복 규칙</label>
              <RepeatDayPicker days={form.repeatDays||[]} onChange={days=>setForm(p=>({...p,repeatDays:days,repeat:formatRepeatDays(days)}))}/>
              {form.routineMode==="event"&&<p style={{margin:"-4px 0 10px",fontSize:11,color:C.gray400}}>시간이 있는 루틴은 오늘 일정과 달력에 루틴 태그로 표시됩니다.</p>}
            </>
          )}
          {kind==="anniv"&&(
            <>
              <p style={{margin:"-2px 0 10px",fontSize:11,color:C.gray400}}>빠른 추가용입니다. 알림·숨김·나이 표시는 가족 탭의 기념일 관리에서 정리할 수 있어요.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.2fr",gap:8,marginBottom:10}}>
                <input type="number" value={form.month} onChange={e=>setForm(p=>({...p,month:e.target.value}))} placeholder="월" style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                <input type="number" value={form.day} onChange={e=>setForm(p=>({...p,day:e.target.value}))} placeholder="일" style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                <input type="number" value={form.year} onChange={e=>setForm(p=>({...p,year:e.target.value}))} placeholder="기준연도" style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </>
          )}
          {kind==="shift"&&(
            <>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>근무자</label>
              <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                {shiftMembers.map(m=>{const sel=(form.shiftMemberId||String(shiftMembers[0]?.id))===String(m.id);return <button key={m.id} onClick={()=>setForm(p=>({...p,shiftMemberId:String(m.id)}))} style={{padding:"5px 10px",borderRadius:20,border:`1.5px solid ${sel?m.color:C.gray200}`,background:sel?m.bg:C.white,color:sel?m.deep:C.gray600,fontSize:11,fontWeight:700,cursor:"pointer"}}>{getZ(m.zodiac).e} {m.name}</button>;})}
              </div>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>근무 유형</label>
              {existingShiftType&&(
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:C.gray50,borderRadius:12,padding:"10px 12px",marginBottom:10}}>
                  <div>
                    <p style={{margin:0,fontSize:12,fontWeight:900,color:C.gray800}}>현재 입력된 근무</p>
                    <p style={{margin:"2px 0 0",fontSize:11,color:existingShiftType.color,fontWeight:800}}>{shiftLabel(existingShiftType)} · {existingShiftType.time}</p>
                  </div>
                  <button onClick={deleteShiftEntry} style={{border:"none",background:C.redBg,color:C.red,borderRadius:10,padding:"7px 10px",fontSize:11,fontWeight:900,cursor:"pointer"}}>근무 삭제</button>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>
                {activeShiftTypes.map(([k,v])=>{const sel=(form.shiftKey||activeShiftTypes[0]?.[0])===k;return <button key={k} onClick={()=>setForm(p=>({...p,shiftKey:k}))} style={{padding:10,borderRadius:12,border:`1.5px solid ${sel?v.color:"transparent"}`,background:v.bg,cursor:"pointer",textAlign:"left"}}><p style={{margin:0,fontSize:16,fontWeight:900,color:v.color}}>{shiftLabel(v)}</p><p style={{margin:"2px 0 0",fontSize:10,color:v.color,opacity:0.75}}>{v.time}</p></button>;})}
              </div>
            </>
          )}
          <button onClick={save} disabled={!canSave} style={{width:"100%",padding:12,borderRadius:12,background:canSave?"linear-gradient(135deg,#38BDF8,#818CF8)":C.gray200,border:"none",color:canSave?"#fff":C.gray400,fontSize:14,fontWeight:900,cursor:canSave?"pointer":"not-allowed"}}>저장</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   FAMILY SCREEN (가족 탭)
════════════════════════════════════════ */
function FamilyScreen({members,setMembers,shiftTypes,setShiftTypes,anniv,setAnniv,events,todos,shiftMap,setShiftMap,timetable,setTimetable}){
  const [subPage,setSubPage]=useState("main");
  const [editMember,setEditMember]=useState(null);
  const [mForm,setMForm]=useState({name:"",zodiac:"rabbit",colorIdx:0,isShift:false,role:"일반 멤버",birthYear:"",birthMonth:"",birthDay:""});
  const [shiftForm,setShiftForm]=useState(null);
  const [reorderMode,setReorderMode]=useState(false);
  const longPressRef=useRef(null);
  const studentMembers=members.filter(m=>m.role==="자녀");
  const [selectedStudent,setSelectedStudent]=useState(studentMembers[0]?.id||3);
  const [selectedDay,setSelectedDay]=useState("월");

  function openAdd(){setEditMember(null);setMForm({name:"",zodiac:"rabbit",colorIdx:0,isShift:false,role:"일반 멤버",birthYear:"",birthMonth:"",birthDay:""});setSubPage("memberForm");}
  function openEdit(m){
    const ci=MEMBER_COLORS.findIndex(c=>c.color===m.color);
    setEditMember(m.id);setMForm({name:m.name,zodiac:m.zodiac,colorIdx:ci>=0?ci:0,isShift:m.isShift||false,role:m.role||"일반 멤버",birthYear:m.birthYear||"",birthMonth:m.birthMonth||"",birthDay:m.birthDay||""});setSubPage("memberForm");
  }
  function saveMember(){
    if(!mForm.name)return;
    const mc=MEMBER_COLORS[mForm.colorIdx];
    const birth={birthYear:mForm.birthYear?+mForm.birthYear:undefined,birthMonth:mForm.birthMonth?+mForm.birthMonth:undefined,birthDay:mForm.birthDay?+mForm.birthDay:undefined};
    if(editMember){setMembers(p=>p.map(m=>m.id===editMember?{...m,name:mForm.name,zodiac:mForm.zodiac,color:mc.color,bg:mc.bg,deep:mc.deep,isShift:mForm.isShift,role:mForm.role,...birth}:m));}
    else{setMembers(p=>[...p,{id:Date.now(),name:mForm.name,zodiac:mForm.zodiac,color:mc.color,bg:mc.bg,deep:mc.deep,isShift:mForm.isShift,role:mForm.role,...birth}]);}
    setSubPage("members");
  }
  function removeMember(id){setMembers(p=>p.filter(m=>m.id!==id));}
  function startLongPress(){
    clearTimeout(longPressRef.current);
    longPressRef.current=setTimeout(()=>setReorderMode(true),520);
  }
  function stopLongPress(){clearTimeout(longPressRef.current);}
  function moveMember(id,dir){
    setMembers(p=>{
      const idx=p.findIndex(m=>m.id===id);
      const nextIdx=idx+dir;
      if(idx<0||nextIdx<0||nextIdx>=p.length)return p;
      const arr=[...p];
      const [item]=arr.splice(idx,1);
      arr.splice(nextIdx,0,item);
      return arr;
    });
  }
  function splitShiftTime(time){
    const clean=String(time||"").replace("(+1)","").trim();
    if(!clean||clean==="-")return{start:"",end:"",nextDay:false};
    const [start="",end=""]=clean.split("~");
    return{start,end,nextDay:String(time||"").includes("+1")};
  }
  function openShiftForm(key){
    const v=key?shiftTypes[key]:{label:"",full:"",color:C.sky,bg:C.skyBg,time:"09:00~18:00",enabled:true};
    const parsed=splitShiftTime(v.time);
    setShiftForm({key:key||"",label:v.label||"",full:v.full||"",start:v.start||parsed.start,end:v.end||parsed.end,nextDay:v.nextDay||parsed.nextDay,color:v.color||C.sky,bg:v.bg||C.skyBg,enabled:v.enabled!==false});
  }
  function saveShiftType(){
    if(!shiftForm?.full&&!shiftForm?.label)return;
    const key=shiftForm.key||`S${Date.now()}`;
    const label=shiftForm.label||firstWord(shiftForm.full);
    const time=(shiftForm.start||shiftForm.end)?`${shiftForm.start||"--:--"}~${shiftForm.end||"--:--"}${shiftForm.nextDay?"(+1)":""}`:"-";
    setShiftTypes(p=>({...p,[key]:{...p[key],label,full:shiftForm.full||label,start:shiftForm.start,end:shiftForm.end,nextDay:shiftForm.nextDay,time,color:shiftForm.color,bg:shiftForm.bg,enabled:shiftForm.enabled}}));
    setShiftForm(null);
  }
  function shiftEntries(){
    return Object.entries(shiftMap||{}).flatMap(([memberId,days])=>
      Object.entries(days||{}).map(([date,key])=>({memberId:+memberId,date,key,member:members.find(m=>m.id===+memberId),type:shiftTypes[key]}))
    ).sort((a,b)=>a.date.localeCompare(b.date));
  }
  function deleteShiftEntry(memberId,date){
    setShiftMap(p=>{
      const mm={...(p[memberId]||{})};
      delete mm[date];
      return{...p,[memberId]:mm};
    });
  }
  function clearNonMayShifts(){
    setShiftMap(p=>{
      const next={};
      Object.entries(p||{}).forEach(([memberId,days])=>{
        next[memberId]=Object.fromEntries(Object.entries(days||{}).filter(([date])=>date.startsWith("2026-05-")));
      });
      return next;
    });
  }

  const BackBtn=({to})=><button onClick={()=>setSubPage(to)} style={{background:"none",border:"none",color:C.sky,fontSize:13,fontWeight:700,cursor:"pointer",padding:"0 0 12px 0",display:"block"}}>← 뒤로</button>;
  function updateLesson(memberId,day,idx,patch){
    setTimetable(p=>{
      const memberTable=p[memberId]||{};
      const lessons=[...(memberTable[day]||[])];
      lessons[idx]={...lessons[idx],...patch};
      return{...p,[memberId]:{...memberTable,[day]:lessons}};
    });
  }
  function addLesson(memberId,day){
    setTimetable(p=>{
      const memberTable=p[memberId]||{};
      const lessons=[...(memberTable[day]||[])];
      lessons.push({period:lessons.length+1,time:"",subject:"",color:SUBJECT_COLORS[lessons.length%SUBJECT_COLORS.length]});
      return{...p,[memberId]:{...memberTable,[day]:lessons}};
    });
  }
  function removeLesson(memberId,day,idx){
    setTimetable(p=>{
      const memberTable=p[memberId]||{};
      const lessons=(memberTable[day]||[]).filter((_,i)=>i!==idx).map((x,i)=>({...x,period:i+1}));
      return{...p,[memberId]:{...memberTable,[day]:lessons}};
    });
  }
  function WidgetPreview(){
    const todayEvents=(events?.[TODAY]||[]).slice(0,3);
    const todayTodos=(todos||[]).filter(t=>!t.done&&!t.skipped).slice(0,3);
    const shiftMember=members.find(m=>m.isShift);
    const nearestAnniv=anniv.filter(a=>a.showHome!==false).map(a=>({ ...a, ...calcDday(a.isLunar?a.solarMonth:a.month,a.isLunar?a.solarDay:a.day) })).sort((a,b)=>a.diff-b.diff)[0];
    const widgetStudent=studentMembers[0]||members[0];
    const widgetMaxPeriods=Math.min(4,Math.max(1,...TIMETABLE_DAYS.map(d=>(timetable?.[widgetStudent?.id]?.[d]||[]).length)));
    const widgetTimeSource=TIMETABLE_DAYS.find(d=>(timetable?.[widgetStudent?.id]?.[d]||[]).length)||"월";
    const widgetPeriodRows=Array.from({length:widgetMaxPeriods},(_,i)=>{
      const src=(timetable?.[widgetStudent?.id]?.[widgetTimeSource]||[])[i]||(timetable?.[widgetStudent?.id]?.월||[])[i]||{};
      return{period:i+1,time:src.time||""};
    });
    const WidgetShell=({title,sub,children,wide=false})=>(
      <div style={{background:"#1C1C1E",borderRadius:18,padding:14,color:"#fff",boxShadow:"0 12px 24px rgba(15,23,42,0.18)",minHeight:wide?148:132}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <p style={{margin:0,fontSize:13,fontWeight:900}}>{title}</p>
            {sub&&<p style={{margin:"2px 0 0",fontSize:10,color:"rgba(255,255,255,0.55)"}}>{sub}</p>}
          </div>
          <span style={{fontSize:16}}>🏠</span>
        </div>
        {children}
      </div>
    );
    return(
      <div style={{padding:14,paddingTop:18}}>
        <BackBtn to="main"/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12}}>
          <div>
            <p style={{fontSize:18,fontWeight:900,color:C.gray800,margin:"0 0 4px"}}>위젯 미리보기</p>
            <p style={{fontSize:12,color:C.gray400,margin:0}}>홈화면에 올릴 가족 정보 4종을 미리 확인해요.</p>
          </div>
          <Tag label="4종" color={C.skyDeep} bg={C.skyBg}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{gridColumn:"1 / -1"}}>
            <WidgetShell title="가족 일정" sub="오늘" wide>
              {todayEvents.map((ev,i)=>{
                const m=members.find(x=>x.id===ev.memberId);
                return(
                  <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:i>0?"1px solid rgba(255,255,255,0.08)":"none"}}>
                    <span style={{fontSize:16}}>{m?getZ(m.zodiac).e:"👨‍👩‍👧"}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontSize:12,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ev.title}</p>
                      <p style={{margin:"1px 0 0",fontSize:10,color:"rgba(255,255,255,0.5)"}}>{ev.timeS||"종일"}{ev.place?` · ${ev.place}`:""}</p>
                    </div>
                  </div>
                );
              })}
            </WidgetShell>
          </div>

          <WidgetShell title="근무" sub={shiftMember?shiftMember.name:"근무자 없음"}>
            <div style={{display:"flex",gap:6}}>
              {["2026-05-25","2026-05-26","2026-05-27"].map((d,i)=>{
                const key=shiftMember?(shiftMap?.[shiftMember.id]||{})[d]:null;
                const st=key?shiftTypes[key]:null;
                return(
                  <div key={d} style={{flex:1,borderRadius:12,padding:"8px 4px",background:st?st.bg:"rgba(255,255,255,0.08)",textAlign:"center"}}>
                    <p style={{margin:"0 0 3px",fontSize:9,color:st?st.color:"rgba(255,255,255,0.45)"}}>{["오늘","내일","모레"][i]}</p>
                    <p style={{margin:0,fontSize:15,fontWeight:900,color:st?st.color:"#fff"}}>{st?shiftLabel(st):"-"}</p>
                  </div>
                );
              })}
            </div>
            <p style={{margin:"9px 0 0",fontSize:10,color:"rgba(255,255,255,0.5)"}}>이번 주 7일 스트립</p>
          </WidgetShell>

          <div style={{gridColumn:"1 / -1"}}>
            <WidgetShell title="시간표" sub={`${widgetStudent?.name||"자녀"} · 배경화면형`} wide>
              <div style={{display:"grid",gridTemplateColumns:"48px repeat(5,1fr)",gap:4}}>
                <div style={{borderRadius:10,padding:"6px 3px",background:"rgba(255,255,255,0.06)"}}>
                  <p style={{margin:"0 0 5px",height:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,color:"rgba(255,255,255,0.45)"}}>시간</p>
                  {widgetPeriodRows.map(row=>(
                    <div key={row.period} style={{height:34,borderRadius:8,marginBottom:4,background:"rgba(255,255,255,0.08)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
                      <p style={{margin:0,width:"100%",fontSize:8,fontWeight:900,color:"rgba(255,255,255,0.8)",lineHeight:1}}>{row.period}교시</p>
                      <p style={{margin:"3px 0 0",width:"100%",fontSize:7,color:"rgba(255,255,255,0.45)",lineHeight:1}}>{row.time?.split("~")[0]||"--:--"}</p>
                    </div>
                  ))}
                </div>
                {TIMETABLE_DAYS.map(d=>(
                  <div key={d} style={{borderRadius:10,padding:"6px 3px",background:d==="월"?"rgba(56,189,248,0.18)":"rgba(255,255,255,0.07)"}}>
                    <p style={{margin:"0 0 5px",height:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:d==="월"?C.sky:"#fff"}}>{d}</p>
                    {widgetPeriodRows.map((_,i)=>{
                      const x=(timetable?.[widgetStudent?.id]?.[d]||[])[i]||{};
                      return(
                        <div key={i} style={{height:34,borderRadius:8,marginBottom:4,background:"rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 2px"}}>
                          <p style={{margin:0,width:"100%",textAlign:"center",fontSize:8,fontWeight:900,color:x.color||"rgba(255,255,255,0.35)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.subject||"-"}</p>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </WidgetShell>
          </div>

          <WidgetShell title="기념일" sub="가장 가까운 날">
            {nearestAnniv&&<>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:42,height:42,borderRadius:14,background:C.amberBg,display:"flex",alignItems:"center",justifyContent:"center",color:C.amberDeep,fontWeight:900,fontSize:16}}>
                  {nearestAnniv.isLunar?nearestAnniv.solarDay:nearestAnniv.day}
                </div>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,fontSize:12,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nearestAnniv.label}</p>
                  <p style={{margin:"2px 0 0",fontSize:10,color:"rgba(255,255,255,0.55)"}}>{annivSubtitle(nearestAnniv,{year:nearestAnniv.year},members)}</p>
                </div>
              </div>
              <p style={{margin:"12px 0 0",fontSize:22,fontWeight:900,color:C.amber}}>D-{nearestAnniv.diff}</p>
            </>}
          </WidgetShell>

          <div style={{gridColumn:"1 / -1"}}>
            <WidgetShell title="오늘 할 일" sub="체크 리스트" wide>
              {todayTodos.map((t,i)=>{
                const m=members.find(x=>x.id===t.memberId);
                return(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:i>0?"1px solid rgba(255,255,255,0.08)":"none"}}>
                    <span style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${t.isRoutine?C.violet:C.mint}`,display:"inline-block"}}/>
                    <span style={{flex:1,fontSize:12,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.text}</span>
                    {m&&<span style={{fontSize:14}}>{getZ(m.zodiac).e}</span>}
                  </div>
                );
              })}
            </WidgetShell>
          </div>
        </div>
      </div>
    );
  }
  function TimetableManager(){
    const student=members.find(m=>m.id===selectedStudent)||studentMembers[0]||members[0];
    const lessons=timetable?.[student?.id]?.[selectedDay]||[];
    const maxPeriods=Math.max(1,...TIMETABLE_DAYS.map(d=>(timetable?.[student?.id]?.[d]||[]).length));
    const timeSource=(timetable?.[student?.id]?.[selectedDay]||[]).length?selectedDay:(TIMETABLE_DAYS.find(d=>(timetable?.[student?.id]?.[d]||[]).length)||"월");
    const periodRows=Array.from({length:maxPeriods},(_,i)=>{
      const src=(timetable?.[student?.id]?.[timeSource]||[])[i]||(timetable?.[student?.id]?.월||[])[i]||{};
      return{period:i+1,time:src.time||""};
    });
    return(
      <div style={{padding:14,paddingTop:18}}>
        <BackBtn to="main"/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12}}>
          <div>
            <p style={{fontSize:18,fontWeight:900,color:C.gray800,margin:"0 0 4px"}}>시간표 관리</p>
            <p style={{fontSize:12,color:C.gray400,margin:0}}>월~금 시간, 과목, 색상을 수정하고 배경화면용 미리보기를 확인해요.</p>
          </div>
          <Tag label="배경화면" color={C.violetDeep} bg={C.violetBg}/>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto"}}>
          {studentMembers.map(m=>{
            const sel=student?.id===m.id;
            return <button key={m.id} onClick={()=>setSelectedStudent(m.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",borderRadius:20,border:"1.5px solid",borderColor:sel?m.color:C.gray200,background:sel?m.bg:C.white,color:sel?m.deep:C.gray600,fontSize:12,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>{getZ(m.zodiac).e} {m.name}</button>;
          })}
        </div>

        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {TIMETABLE_DAYS.map(d=><button key={d} onClick={()=>setSelectedDay(d)} style={{flex:1,padding:"8px 0",borderRadius:14,border:"1.5px solid",borderColor:selectedDay===d?C.sky:C.gray200,background:selectedDay===d?C.skyBg:C.white,color:selectedDay===d?C.skyDeep:C.gray600,fontSize:12,fontWeight:900,cursor:"pointer"}}>{d}</button>)}
        </div>

        <div style={{background:C.white,borderRadius:16,padding:14,boxShadow:"0 4px 18px rgba(0,0,0,0.07)",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <p style={{margin:0,fontSize:14,fontWeight:900,color:C.gray800}}>{student?.name} {selectedDay}요일</p>
            <button onClick={()=>addLesson(student.id,selectedDay)} style={{padding:"5px 11px",borderRadius:20,border:"none",background:C.skyBg,color:C.skyDeep,fontSize:11,fontWeight:900,cursor:"pointer"}}>+ 교시</button>
          </div>
          {lessons.map((lesson,idx)=>(
            <div key={idx} style={{display:"grid",gridTemplateColumns:"82px 1fr 28px",gap:8,alignItems:"start",marginBottom:10}}>
              <div style={{borderRadius:13,background:lesson.color||C.skyBg,padding:"7px 7px 8px",minHeight:64,color:C.white}}>
                <p style={{margin:"0 0 5px",fontSize:12,fontWeight:900,lineHeight:1}}>{idx+1}교시</p>
                <input value={lesson.time||""} onChange={e=>updateLesson(student.id,selectedDay,idx,{time:e.target.value})} placeholder="09:00~09:45" style={{width:"100%",padding:"5px 4px",borderRadius:7,border:"none",fontSize:9,outline:"none",fontFamily:"inherit",background:"rgba(255,255,255,0.9)",color:C.gray800}}/>
              </div>
              <input value={lesson.subject||""} onChange={e=>updateLesson(student.id,selectedDay,idx,{subject:e.target.value})} placeholder="과목" style={{width:"100%",padding:"12px 10px",borderRadius:12,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <button onClick={()=>removeLesson(student.id,selectedDay,idx)} style={{background:"none",border:"none",color:C.gray400,fontSize:15,cursor:"pointer"}}>×</button>
              <div style={{gridColumn:"2 / 4",display:"flex",gap:6,marginTop:-2}}>
                {SUBJECT_COLORS.map(c=><button key={c} onClick={()=>updateLesson(student.id,selectedDay,idx,{color:c})} style={{width:18,height:18,borderRadius:"50%",background:c,border:"2px solid",borderColor:lesson.color===c?C.gray800:"transparent",cursor:"pointer"}}/>)}
              </div>
            </div>
          ))}
        </div>

        <div style={{background:"#101114",borderRadius:22,padding:16,color:"#fff",boxShadow:"0 16px 30px rgba(15,23,42,0.22)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <p style={{margin:0,fontSize:16,fontWeight:900}}>{student?.name} 시간표</p>
              <p style={{margin:"2px 0 0",fontSize:11,color:"rgba(255,255,255,0.55)"}}>배경화면용 미리보기 · {selectedDay}요일</p>
            </div>
            <span style={{fontSize:22}}>{student?getZ(student.zodiac).e:"📚"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"58px repeat(5,1fr)",gap:5}}>
            <div style={{borderRadius:12,padding:"8px 4px",background:"rgba(255,255,255,0.06)"}}>
              <p style={{margin:"0 0 7px",height:17,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",fontSize:10,fontWeight:900,color:"rgba(255,255,255,0.45)"}}>시간</p>
              {periodRows.map(row=>(
                <div key={row.period} style={{height:44,borderRadius:9,padding:"5px 3px",marginBottom:5,background:"rgba(255,255,255,0.08)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
                  <p style={{margin:0,width:"100%",textAlign:"center",fontSize:9,fontWeight:900,color:"rgba(255,255,255,0.8)",lineHeight:1}}>{row.period}교시</p>
                  <p style={{margin:"4px 0 0",width:"100%",textAlign:"center",fontSize:8,color:"rgba(255,255,255,0.45)",lineHeight:1}}>{row.time?.split("~")[0]||"--:--"}</p>
                </div>
              ))}
            </div>
            {TIMETABLE_DAYS.map(d=>(
              <div key={d} style={{background:d===selectedDay?"rgba(56,189,248,0.18)":"rgba(255,255,255,0.07)",borderRadius:12,padding:"8px 4px"}}>
                <p style={{margin:"0 0 7px",height:17,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",fontSize:12,fontWeight:900,color:d===selectedDay?C.sky:"#fff"}}>{d}</p>
                {periodRows.map((_,i)=>{
                  const x=(timetable?.[student?.id]?.[d]||[])[i]||{};
                  return(
                    <div key={i} style={{height:44,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.08)",borderRadius:9,padding:"5px 3px",marginBottom:5}}>
                      <p style={{margin:0,width:"100%",textAlign:"center",fontSize:10,fontWeight:900,color:x.color||"rgba(255,255,255,0.35)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{x.subject||"-"}</p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{height:"100%",overflowY:"auto",paddingBottom:80}}>
      {subPage==="main"&&(<>
        <div style={{background:"linear-gradient(150deg,#475569,#1E293B)",padding:"18px 18px 22px"}}>
          <h3 style={{color:"#fff",margin:"0 0 4px",fontSize:18,fontWeight:800}}>가족</h3>
          <p style={{color:"rgba(255,255,255,0.6)",margin:0,fontSize:12}}>가족 멤버 · 기념일 · 근무 · 위젯</p>
        </div>
        <div style={{padding:14}}>
          {[
            {icon:"👨‍👩‍👧‍👦",l:"가족 멤버 관리",s:`${members.length}명 등록됨`,to:"members"},
            {icon:"🏥",l:"근무 설정",s:"근무명·표시명·시간 직접 수정",to:"shift"},
            {icon:"🎂",l:"기념일 관리",s:"생일·기념일·관계 인물",to:"anniv"},
            {icon:"📚",l:"시간표 관리",s:"월~금·시간·과목·배경화면 미리보기",to:"timetable"},
            {icon:"🖥",l:"위젯 미리보기",s:"홈화면 위젯 4종",to:"widget"},
            {icon:"⚙️",l:"앱 설정",s:"알림·캘린더·구독",to:"appset"},
          ].map(item=>(
            <button key={item.to} onClick={()=>setSubPage(item.to)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderRadius:14,background:C.white,border:"none",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",marginBottom:10,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:22,flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:700,color:C.gray800}}>{item.l}</p><p style={{margin:"2px 0 0",fontSize:11,color:C.gray400}}>{item.s}</p></div>
              <span style={{color:C.gray200,fontSize:16}}>›</span>
            </button>
          ))}
        </div>
      </>)}

      {subPage==="members"&&(
        <div style={{padding:14,paddingTop:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <BackBtn to="main"/>
            <div style={{display:"flex",gap:6}}>
              {reorderMode&&<button onClick={()=>setReorderMode(false)} style={{padding:"5px 12px",borderRadius:20,background:C.gray100,border:"none",color:C.gray600,fontSize:12,fontWeight:800,cursor:"pointer"}}>완료</button>}
              <button onClick={openAdd} style={{padding:"5px 14px",borderRadius:20,background:"linear-gradient(135deg,#38BDF8,#818CF8)",border:"none",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ 추가</button>
            </div>
          </div>
          <div style={{background:reorderMode?C.violetBg:C.skyBg,borderRadius:13,padding:"10px 12px",marginBottom:10}}>
            <p style={{margin:0,fontSize:12,fontWeight:900,color:reorderMode?C.violetDeep:C.skyDeep}}>
              {reorderMode?"순서 변경 중":"멤버 카드를 꾹 누르면 순서를 바꿀 수 있어요"}
            </p>
            <p style={{margin:"2px 0 0",fontSize:11,color:reorderMode?C.violetDeep:C.skyDeep}}>
              이 순서는 홈의 가족 오늘 요약에도 그대로 적용됩니다.
            </p>
          </div>
          {members.map((m,i)=>{const z=getZ(m.zodiac);return(
            <div key={m.id}
              onPointerDown={startLongPress}
              onPointerUp={stopLongPress}
              onPointerLeave={stopLongPress}
              style={{background:C.white,borderRadius:14,padding:"12px 14px",marginBottom:8,boxShadow:reorderMode?`0 0 0 2px ${C.violet}33, 0 2px 8px rgba(0,0,0,0.06)`:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",alignItems:"center",gap:10,cursor:"grab",touchAction:"manipulation"}}>
              {reorderMode&&<div style={{color:C.gray400,fontSize:16,fontWeight:900,lineHeight:1}}>☰</div>}
              <div style={{width:42,height:42,borderRadius:"50%",background:z.bg,border:`2px solid ${z.c}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{z.e}</div>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:14,fontWeight:700,color:C.gray800}}>{m.name}</p>
                <div style={{display:"flex",gap:5,alignItems:"center",marginTop:2}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:m.color}}/>
                  <span style={{fontSize:10,color:C.gray400}}>{m.role}</span>
                  {m.isShift&&<Tag label="교대근무" color={C.violetDeep} bg={C.violetBg}/>}
                </div>
              </div>
              {reorderMode?(
                <div style={{display:"flex",gap:4}}>
                  <button disabled={i===0} onClick={()=>moveMember(m.id,-1)} style={{width:28,height:28,borderRadius:9,border:"none",background:i===0?C.gray100:C.violetBg,color:i===0?C.gray400:C.violetDeep,fontSize:14,fontWeight:900,cursor:i===0?"default":"pointer"}}>↑</button>
                  <button disabled={i===members.length-1} onClick={()=>moveMember(m.id,1)} style={{width:28,height:28,borderRadius:9,border:"none",background:i===members.length-1?C.gray100:C.violetBg,color:i===members.length-1?C.gray400:C.violetDeep,fontSize:14,fontWeight:900,cursor:i===members.length-1?"default":"pointer"}}>↓</button>
                </div>
              ):(
                <>
                  <button onClick={()=>openEdit(m)} style={{background:"none",border:"none",color:C.sky,fontSize:12,fontWeight:700,cursor:"pointer"}}>수정</button>
                  <button onClick={()=>removeMember(m.id)} style={{background:"none",border:"none",color:C.gray400,fontSize:14,cursor:"pointer",padding:"0 4px"}}>✕</button>
                </>
              )}
            </div>
          );})}
        </div>
      )}

      {subPage==="memberForm"&&(
        <div style={{padding:14,paddingTop:18}}>
          <BackBtn to="members"/>
          <div style={{background:C.white,borderRadius:16,padding:16,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <p style={{margin:"0 0 14px",fontSize:14,fontWeight:800,color:C.gray800}}>{editMember?"멤버 수정":"새 멤버 추가"}</p>
            <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>이름</label>
            <input value={mForm.name} onChange={e=>setMForm(p=>({...p,name:e.target.value}))} placeholder="이름" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:14,outline:"none",marginBottom:14,boxSizing:"border-box",fontFamily:"inherit"}}/>
            <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>12지신 캐릭터</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {ZODIAC.map(z=><button key={z.key} onClick={()=>setMForm(p=>({...p,zodiac:z.key}))} style={{width:40,height:40,borderRadius:"50%",border:"2.5px solid",borderColor:mForm.zodiac===z.key?z.c:"transparent",background:z.bg,cursor:"pointer",fontSize:19,boxShadow:mForm.zodiac===z.key?`0 0 0 2px ${z.c}40`:"none"}}>{z.e}</button>)}
            </div>
            <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>색상</label>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {MEMBER_COLORS.map((mc,ci)=><button key={ci} onClick={()=>setMForm(p=>({...p,colorIdx:ci}))} style={{width:28,height:28,borderRadius:"50%",border:"2.5px solid",borderColor:mForm.colorIdx===ci?"#222":"transparent",background:mc.color,cursor:"pointer"}}/>)}
            </div>
            <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>권한</label>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {["보호자","일반 멤버","자녀"].map(r=><button key={r} onClick={()=>setMForm(p=>({...p,role:r}))} style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:mForm.role===r?C.sky:C.gray200,background:mForm.role===r?C.skyBg:C.white,color:mForm.role===r?C.skyDeep:C.gray600,fontSize:11,fontWeight:700,cursor:"pointer"}}>{r}</button>)}
            </div>
            <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>생년월일 <span style={{color:C.gray400,fontWeight:400}}>(나이 계산용)</span></label>
            <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr",gap:8,marginBottom:14}}>
              <input type="number" value={mForm.birthYear} onChange={e=>setMForm(p=>({...p,birthYear:e.target.value}))} placeholder="2021" style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <input type="number" value={mForm.birthMonth} onChange={e=>setMForm(p=>({...p,birthMonth:e.target.value}))} placeholder="6월" style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              <input type="number" value={mForm.birthDay} onChange={e=>setMForm(p=>({...p,birthDay:e.target.value}))} placeholder="1일" style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.gray50,borderRadius:12,padding:"10px 14px",marginBottom:16}}>
              <div><p style={{margin:0,fontSize:13,fontWeight:700,color:C.gray800}}>교대 근무자</p><p style={{margin:"1px 0 0",fontSize:11,color:C.gray400}}>달력 근무 입력 활성화</p></div>
              <button onClick={()=>setMForm(p=>({...p,isShift:!p.isShift}))} style={{width:42,height:24,borderRadius:12,border:"none",background:mForm.isShift?C.violet:C.gray200,cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:mForm.isShift?20:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
              </button>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setSubPage("members")} style={{flex:1,padding:11,borderRadius:12,background:C.gray100,border:"none",color:C.gray600,fontSize:13,fontWeight:700,cursor:"pointer"}}>취소</button>
              <button onClick={saveMember} style={{flex:2,padding:11,borderRadius:12,background:mForm.name?"linear-gradient(135deg,#38BDF8,#818CF8)":C.gray200,border:"none",color:mForm.name?"#fff":C.gray400,fontSize:13,fontWeight:800,cursor:mForm.name?"pointer":"not-allowed"}}>{editMember?"수정 완료":"추가"}</button>
            </div>
          </div>
        </div>
      )}

      {subPage==="shift"&&(
        <div style={{padding:14,paddingTop:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <BackBtn to="main"/>
            <button onClick={()=>openShiftForm(null)} style={{padding:"5px 14px",borderRadius:20,background:"linear-gradient(135deg,#38BDF8,#818CF8)",border:"none",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ 유형</button>
          </div>
          <p style={{fontSize:14,fontWeight:800,color:C.gray800,margin:"0 0 12px"}}>근무 유형 관리</p>
          {shiftForm&&(
            <div style={{background:C.white,borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:`1.5px solid ${C.sky}`}}>
              <p style={{margin:"0 0 12px",fontSize:14,fontWeight:800,color:C.gray800}}>{shiftForm.key?"근무 유형 수정":"근무 유형 추가"}</p>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>유형명</label>
              <input value={shiftForm.full} onChange={e=>setShiftForm(p=>({...p,full:e.target.value,label:p.label||firstWord(e.target.value)}))} placeholder="예) 오전 근무, 마감조" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,fontFamily:"inherit"}}/>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>달력 표시명</label>
              <input value={shiftForm.label} onChange={e=>setShiftForm(p=>({...p,label:e.target.value}))} placeholder="예) 오전, 마감, D" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",marginBottom:10,fontFamily:"inherit"}}/>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:4}}>시간</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <input type="time" value={shiftForm.start||""} onChange={e=>setShiftForm(p=>({...p,start:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                <input type="time" value={shiftForm.end||""} onChange={e=>setShiftForm(p=>({...p,end:e.target.value}))} style={{width:"100%",padding:"9px 10px",borderRadius:10,border:`1.5px solid ${C.gray200}`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <button onClick={()=>setShiftForm(p=>({...p,nextDay:!p.nextDay}))} style={{width:"100%",padding:"9px 12px",borderRadius:12,border:"1.5px solid",borderColor:shiftForm.nextDay?C.teal:C.gray200,background:shiftForm.nextDay?C.tealBg:C.gray50,color:shiftForm.nextDay?C.tealDeep:C.gray600,fontSize:12,fontWeight:800,cursor:"pointer",marginBottom:10,textAlign:"left"}}>다음날 종료 {shiftForm.nextDay?"ON":"OFF"}</button>
              <label style={{fontSize:11,fontWeight:700,color:C.gray600,display:"block",marginBottom:6}}>색상</label>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                {[
                  {c:"#1D4ED8",bg:"#DBEAFE"},{c:"#6D28D9",bg:"#EDE9FE"},{c:"#0F766E",bg:"#CCFBF1"},{c:"#EA580C",bg:"#FFF7ED"},{c:"#64748B",bg:"#F1F5F9"}
                ].map(x=><button key={x.c} onClick={()=>setShiftForm(p=>({...p,color:x.c,bg:x.bg}))} style={{width:28,height:28,borderRadius:"50%",border:"2.5px solid",borderColor:shiftForm.color===x.c?C.gray800:"transparent",background:x.c,cursor:"pointer"}}/>)}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setShiftForm(null)} style={{flex:1,padding:10,borderRadius:12,background:C.gray100,border:"none",color:C.gray600,fontSize:13,fontWeight:700,cursor:"pointer"}}>취소</button>
                <button onClick={saveShiftType} style={{flex:2,padding:10,borderRadius:12,background:"linear-gradient(135deg,#38BDF8,#818CF8)",border:"none",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"}}>저장</button>
              </div>
            </div>
          )}
          {Object.entries(shiftTypes).map(([k,v])=>(
            <div key={k} style={{background:C.white,borderRadius:14,padding:"14px 16px",marginBottom:8,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",alignItems:"center",gap:14,borderLeft:`4px solid ${v.enabled===false?C.gray200:v.color}`,opacity:v.enabled===false?0.5:1}}>
              <div style={{width:44,height:44,borderRadius:12,background:v.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:18,fontWeight:900,color:v.color}}>{shiftLabel(v)}</span></div>
              <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:800,color:C.gray800}}>{v.full}</p><p style={{margin:"3px 0 0",fontSize:12,color:C.gray400}}>{v.time}</p></div>
              <button onClick={()=>openShiftForm(k)} style={{background:"none",border:"none",color:C.sky,fontSize:12,fontWeight:700,cursor:"pointer"}}>수정</button>
              <button onClick={()=>setShiftTypes(p=>({...p,[k]:{...p[k],enabled:p[k].enabled===false}}))} style={{background:"none",border:"none",color:C.gray400,fontSize:11,fontWeight:700,cursor:"pointer"}}>{v.enabled===false?"켜기":"끄기"}</button>
            </div>
          ))}
          <div style={{background:C.white,borderRadius:16,padding:16,margin:"12px 0",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:10}}>
              <div>
                <p style={{margin:0,fontSize:14,fontWeight:900,color:C.gray800}}>입력된 근무 관리</p>
                <p style={{margin:"2px 0 0",fontSize:11,color:C.gray400}}>달력에 직접 입력한 근무만 표시됩니다.</p>
              </div>
              <button onClick={clearNonMayShifts} style={{border:"none",background:C.amberBg,color:C.amberDeep,borderRadius:12,padding:"7px 10px",fontSize:11,fontWeight:900,cursor:"pointer",whiteSpace:"nowrap"}}>5월 외 정리</button>
            </div>
            {shiftEntries().length?(
              <div style={{maxHeight:220,overflowY:"auto",paddingRight:2}}>
                {shiftEntries().map(x=>(
                  <div key={`${x.memberId}-${x.date}`} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0",borderTop:`1px solid ${C.gray100}`}}>
                    <div style={{width:42,height:42,borderRadius:12,background:x.type?.bg||C.gray100,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:15,fontWeight:900,color:x.type?.color||C.gray400}}>{x.type?shiftLabel(x.type):x.key}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontSize:12,fontWeight:900,color:C.gray800}}>{x.date} · {x.member?.name||"근무자"}</p>
                      <p style={{margin:"2px 0 0",fontSize:11,color:C.gray400}}>{x.type?.full||x.key} {x.type?.time?`· ${x.type.time}`:""}</p>
                    </div>
                    <button onClick={()=>deleteShiftEntry(x.memberId,x.date)} style={{border:"none",background:C.redBg,color:C.red,borderRadius:10,padding:"6px 9px",fontSize:11,fontWeight:900,cursor:"pointer"}}>삭제</button>
                  </div>
                ))}
              </div>
            ):(
              <div style={{background:C.gray50,borderRadius:12,padding:14,textAlign:"center",fontSize:12,color:C.gray400,fontWeight:700}}>입력된 근무가 없습니다.</div>
            )}
          </div>
          <div style={{background:C.skyBg,borderRadius:14,padding:"12px 16px",marginTop:4}}>
            <p style={{margin:"0 0 4px",fontSize:12,fontWeight:800,color:C.skyDeep}}>📅 근무 입력 방법</p>
            <p style={{margin:0,fontSize:12,color:C.skyDeep,lineHeight:1.6}}>달력 탭 → 날짜 선택 → 근무 버튼 탭 → 가족이 만든 근무 유형 선택 → 자동 다음 날 이동. 잘못 입력한 근무는 같은 화면 또는 입력된 근무 관리에서 삭제할 수 있어요.</p>
          </div>
        </div>
      )}

      {subPage==="anniv"&&<AnnivScreen members={members} anniv={anniv} setAnniv={setAnniv} embedded onBack={()=>setSubPage("main")}/>}
      {subPage==="timetable"&&<TimetableManager/>}

      {subPage==="widget"&&<WidgetPreview/>}

      {subPage==="appset"&&(
        <div style={{padding:14,paddingTop:18}}>
          <BackBtn to="main"/>
          <div style={{background:C.gray50,borderRadius:14,padding:20,textAlign:"center",color:C.gray400}}>
            <p style={{fontSize:24,marginBottom:8}}>⚙️</p>
            <p style={{fontSize:14,fontWeight:700,color:C.gray600,margin:0}}>
              앱 설정
            </p>
            <p style={{fontSize:12,color:C.gray400,margin:"4px 0 0"}}>
              준비 중입니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   APP ROOT
════════════════════════════════════════ */
const TABS=[
  {id:"home",    icon:"🏠",label:"홈"},
  {id:"calendar",icon:"📅",label:"달력"},
  {id:"add",     icon:"➕",label:"등록"},
  {id:"todo",    icon:"✅",label:"할일"},
  {id:"family",  icon:"👨‍👩‍👧",label:"가족"},
];
const TAB_C={home:C.sky,calendar:C.sky,add:C.violet,todo:C.mint,family:C.gray600};

export default function App(){
  const [tab,setTab]=useState("home");
  const [members,setMembers]=useState(INIT_MEMBERS);
  const [events,setEvents]=useState(INIT_EVENTS);
  const [todos,setTodos]=useState(INIT_TODOS);
  const [shiftMap,setShiftMap]=useState(INIT_SHIFT_MAP);
  const [shiftTypes,setShiftTypes]=useState(DEFAULT_SHIFT_TYPES);
  const [anniv,setAnniv]=useState(INIT_ANNIV);
  const [timetable,setTimetable]=useState(INIT_TIMETABLE);

  return(
    <div style={{minHeight:"100vh",background:"#BAE6FD",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif",padding:"20px 0"}}>
      <style>{`*{box-sizing:border-box;}input,button{font-family:inherit!important;}::-webkit-scrollbar{display:none;}`}</style>
      {/* phone frame */}
      <div style={{width:375,height:"92vh",background:C.page,borderRadius:46,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.22),0 0 0 10px #111,0 0 0 12px #2a2a2a",display:"flex",flexDirection:"column",position:"relative"}}>
        {/* status bar */}
        <div style={{background:"linear-gradient(150deg,#38BDF8,#818CF8)",padding:"12px 22px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{color:"#fff",fontSize:12,fontWeight:700}}>9:41</span>
          <div style={{width:110,height:26,background:"#000",borderRadius:20,position:"absolute",left:"50%",transform:"translateX(-50%)",top:7}}/>
          <span style={{color:"#fff",fontSize:12}}>🔋</span>
        </div>

        {/* content — position:relative so Sheet (absolute) clips here */}
        <div style={{flex:1,overflow:"hidden",position:"relative",background:C.page}}>
          {tab==="home"    &&<HomeScreen members={members} events={events} setEvents={setEvents} todos={todos} setTodos={setTodos} shiftMap={shiftMap} shiftTypes={shiftTypes} anniv={anniv} goTab={setTab}/>}
          {tab==="calendar"&&<CalendarScreen members={members} events={events} setEvents={setEvents} shiftMap={shiftMap} setShiftMap={setShiftMap} shiftTypes={shiftTypes} anniv={anniv}/>}
          {tab==="add"     &&<AddScreen members={members} setEvents={setEvents} setTodos={setTodos} anniv={anniv} setAnniv={setAnniv} shiftTypes={shiftTypes} shiftMap={shiftMap} setShiftMap={setShiftMap} goTab={setTab}/>}
          {tab==="todo"    &&<TodoScreen members={members} todos={todos} setTodos={setTodos}/>}
          {tab==="family"  &&<FamilyScreen members={members} setMembers={setMembers} shiftTypes={shiftTypes} setShiftTypes={setShiftTypes} anniv={anniv} setAnniv={setAnniv} events={events} todos={todos} shiftMap={shiftMap} setShiftMap={setShiftMap} timetable={timetable} setTimetable={setTimetable}/>}
        </div>

        {/* tab bar */}
        <div style={{background:C.white,borderTop:`1px solid ${C.gray100}`,display:"flex",padding:"6px 0 14px",flexShrink:0}}>
          {TABS.map(t=>{const active=tab===t.id;const ac=TAB_C[t.id];return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 0"}}>
              <span style={{fontSize:18,lineHeight:1,display:"block",transform:active?"scale(1.15)":"scale(1)",transition:"transform 0.12s"}}>{t.icon}</span>
              <span style={{fontSize:9,fontWeight:700,lineHeight:1,color:active?ac:C.gray400}}>{t.label}</span>
              {active&&<div style={{width:4,height:4,borderRadius:"50%",background:ac,marginTop:1}}/>}
            </button>
          );})}
        </div>
      </div>
    </div>
  );
}
