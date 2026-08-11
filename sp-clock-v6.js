"use strict";
/* My Performance 2.3 — authoritative local clock for America/Sao_Paulo. */
(function(){
  const TZ='America/Sao_Paulo';
  let testNow=null;
  const pad=n=>String(n).padStart(2,'0');
  function parts(input){
    const d=input instanceof Date?input:new Date(input||Date.now());
    const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    const o={};for(const p of fmt.formatToParts(d))if(p.type!=='literal')o[p.type]=p.value;
    return{year:Number(o.year),month:Number(o.month),day:Number(o.day),hour:Number(o.hour),minute:Number(o.minute),second:Number(o.second)}
  }
  function nowDate(){return testNow?new Date(testNow):new Date()}
  function todaySP(input){const p=parts(input||nowDate());return`${p.year}-${pad(p.month)}-${pad(p.day)}`}
  function timeSP(input){const p=parts(input||nowDate());return`${pad(p.hour)}:${pad(p.minute)}`}
  function minutesNow(input){const p=parts(input||nowDate());return p.hour*60+p.minute}
  function stamp(input){const p=parts(input||nowDate());return`${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}-03:00`}
  function setTestNow(v){testNow=v||null}
  const api={TIME_ZONE:TZ,parts,today:todaySP,time:timeSP,minutesNow,stamp,now:nowDate,setTestNow};
  window.MyPerformanceClock=api;
  try{window.today=todaySP;today=todaySP}catch{}
})();
