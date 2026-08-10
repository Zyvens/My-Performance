"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MyPerformanceSchedulerCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DAY=1440;
  const SYSTEM_START='2026-08-10';
  const WORK_DOMAINS=new Set(['GSA','Carreira','Estudos']);
  const PRIORITY={critical:400,high:300,normal:180,low:80};
  const pad=n=>String(n).padStart(2,'0');
  const toMin=t=>{if(typeof t==='number')return t;if(!t||!/^\d{1,2}:\d{2}$/.test(String(t)))return null;const[h,m]=String(t).split(':').map(Number);return h*60+m};
  const toTime=n=>{n=((Math.round(n)%DAY)+DAY)%DAY;return`${pad(Math.floor(n/60))}:${pad(n%60)}`};
  const dateObj=s=>new Date(`${s}T12:00:00`);
  const addDays=(s,n)=>{const d=dateObj(s);d.setDate(d.getDate()+n);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const dow=s=>dateObj(s).getDay();
  const weekStart=s=>{const d=dateObj(s),n=(d.getDay()+6)%7;d.setDate(d.getDate()-n);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  function profile(date,opts={}){
    const w=dow(date),extreme=!!opts.weekendExtreme;
    if(w===3)return{wake:300,end:1260,sleepHours:8,label:'Quarta BNI',workEnd:1260,personalEnd:1260};
    if(w===5)return{wake:360,end:extreme?1200:1080,sleepHours:extreme?10:12,label:extreme?'Sexta excepcional até 20:00':'Sexta até 18:00',workEnd:extreme?1200:1080,personalEnd:extreme?1200:1080};
    if(w===6)return{wake:360,end:extreme?840:720,sleepHours:extreme?16:18,label:extreme?'Sábado excepcional até 14:00':'Sábado até 12:00',workEnd:extreme?840:720,personalEnd:extreme?840:720};
    if(w===0)return{wake:360,end:1320,sleepHours:8,label:extreme?'Domingo pessoal + exceção 10:00–12:00':'Domingo pessoal',workStart:600,workEnd:extreme?720:600,personalEnd:1320};
    const extra=Math.max(0,Math.min(120,Number(opts.sleepEmergencyMin||0)));
    return{wake:360,end:1320+extra,sleepHours:8-extra/60,label:extra?'Dia útil · exceção de sono':'Dia útil',workEnd:1320+extra,personalEnd:1320+extra};
  }
  function domainAllowed(domain,date,opts={}){
    if(dow(date)!==0)return true;
    if(!WORK_DOMAINS.has(domain))return true;
    return !!opts.weekendExtreme;
  }
  function isWorkDomain(domain){return WORK_DOMAINS.has(domain)}
  function priorityScore(q,date){
    const l=q?.priorityLevel||((q?.fixedTime||q?.essential)?'critical':q?.questType==='main'?'high':'normal');
    let n=PRIORITY[l]||PRIORITY.normal;
    if(q?.domain==='GSA')n+=50;else if(q?.domain==='Estudos')n+=30;else if(q?.domain==='Pessoal')n+=15;
    if(q?.questType==='main')n+=70;
    if(q?.dueDate){const days=Math.round((dateObj(q.dueDate)-dateObj(date))/864e5);n+=days<0?240:days===0?200:days<=2?150:days<=7?80:days<=14?35:0}
    return n;
  }
  function overlaps(a,b){return a.start<b.end&&a.end>b.start}
  function gaps(slots,start,end,min=1){
    const xs=(slots||[]).filter(x=>x.end>start&&x.start<end).slice().sort((a,b)=>a.start-b.start),out=[];let cur=start;
    for(const x of xs){if(x.start-cur>=min)out.push({start:cur,end:x.start});cur=Math.max(cur,x.end)}
    if(end-cur>=min)out.push({start:cur,end});return out
  }
  function nearestGap(slots,duration,start,end,preferred){
    const gs=gaps(slots,start,end,duration).filter(g=>g.end-g.start>=duration);if(!gs.length)return null;
    const p=Math.max(start,Math.min(end-duration,preferred==null?start:preferred));
    let best=null,bestCost=Infinity;
    for(const g of gs){const s=Math.max(g.start,Math.min(p,g.end-duration)),cost=Math.abs(s-p);if(cost<bestCost){best={start:s,end:s+duration};bestCost=cost}}
    return best
  }
  function validatePlan(plan){
    const errors=[],slots=(plan?.slots||[]).slice().sort((a,b)=>a.start-b.start),p=plan?.profile||{};
    for(let i=0;i<slots.length;i++){
      const x=slots[i];if(x.start<x.end?false:true)errors.push(`invalid:${x.key||i}`);
      if(p.wake!=null&&x.start<p.wake)errors.push(`before-wake:${x.key||i}`);
      if(p.end!=null&&x.end>p.end)errors.push(`after-end:${x.key||i}`);
      if(i&&overlaps(slots[i-1],x))errors.push(`overlap:${slots[i-1].key||i-1}:${x.key||i}`)
    }
    return{ok:errors.length===0,errors}
  }
  function weeklyQuota(weekDone,target){return{target,done:Math.max(0,Number(weekDone||0)),remaining:Math.max(0,target-Math.max(0,Number(weekDone||0))),pct:Math.min(100,Math.round(Math.max(0,Number(weekDone||0))/Math.max(1,target)*100))}}
  function bniTodayTarget(date,doneMin){
    const w=dow(date);if(![1,2,5].includes(w))return 0;const remaining=Math.max(0,120-doneMin);if(!remaining)return 0;
    const eligible=[1,2,5].filter(d=>d>=w).length;return Math.min(120,Math.max(30,Math.ceil((remaining/Math.max(1,eligible))/30)*30))
  }
  function spreadDates(dates,count,loads={},costFn){
    if(!dates.length||count<=0)return[];const out=[],local=Object.assign({},loads);
    for(let i=0;i<count;i++){
      const ideal=count===1?0:i*(dates.length-1)/(count-1);let best=null,bestCost=Infinity;
      for(let j=0;j<dates.length;j++){
        const d=dates[j],distance=Math.abs(j-ideal),load=Number(local[d]||0),extra=costFn?Number(costFn(d,j)||0):0,cost=distance*10+load+extra;
        if(cost<bestCost){best=d;bestCost=cost}
      }
      out.push(best);local[best]=(local[best]||0)+1
    }
    return out
  }
  function emergencySleepAllowed(historyDates,date){
    const dates=(historyDates||[]).slice().sort();if(dates.includes(addDays(date,-1)))return false;
    const start=addDays(date,-6),count=dates.filter(d=>d>=start&&d<=date).length;return count<2
  }
  function meaningfulReason(q){
    const t=String(q?.title||''),d=String(q?.description||''),cat=String(q?.category||'');
    if(q?.adaptiveSession||/^Avançar\s*·/i.test(t)||/^Sessão\s*·/i.test(t))return'Esta é uma sessão automática de avanço da meta-mãe. Ela existe para distribuir o esforço antes do prazo; excluir só faz sentido se a etapa não for útil hoje ou se a própria meta precisar ser replanejada.';
    if(/lead/i.test(t+' '+cat))return'Esta rotina evita que oportunidades comerciais fiquem mais de 24h sem resposta. Se hoje não há leads pendentes, excluir esta ocorrência é apropriado e libera o horário.';
    if(/lattes/i.test(t+' '+d))return'O Lattes faz parte da documentação de captação/FAPERJ e reúne a produção recente do proponente e da equipe. Mantenha se esse material ainda precisa ser criado/atualizado; caso contrário, esta sessão pode sair do dia.';
    if(q?.fixedTime||q?.essential)return'Esta atividade protege uma âncora fixa ou essencial do dia. Removê-la pode quebrar sono, alimentação, treino ou um compromisso com horário definido.';
    if(q?.questType==='main')return'Esta é uma Main Quest e tende a carregar um prazo ou resultado estratégico. Excluir hoje é possível, mas reduz o avanço previsto e o Scheduler precisará compensar em outra janela.';
    return d?`Esta tarefa existe porque: ${d}`:'Esta tarefa está no plano por recorrência, prioridade ou prazo. Se ela não produz valor hoje, pode ser excluída somente desta data.'
  }
  return{SYSTEM_START,DAY,PRIORITY,toMin,toTime,addDays,dow,weekStart,profile,domainAllowed,isWorkDomain,priorityScore,overlaps,gaps,nearestGap,validatePlan,weeklyQuota,bniTodayTarget,spreadDates,emergencySleepAllowed,meaningfulReason};
});
