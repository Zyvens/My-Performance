"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MyPerformanceSchedulerCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DAY=24*60;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function normalizeMinute(n){n=Number(n||0);while(n<0)n+=DAY;return n}
  function computeLateWakeWindow({actualWake,standardEnd=22*60,afterNoonThreshold=12*60,minAfterNoon=12*60,hardCutoff=null}={}){
    actualWake=normalizeMinute(actualWake);let end=Number(standardEnd||22*60);while(end<=actualWake)end+=DAY;
    const lateAfterNoon=actualWake>afterNoonThreshold;
    if(lateAfterNoon)end=Math.max(end,actualWake+minAfterNoon);
    if(Number.isFinite(hardCutoff)){
      let cut=Number(hardCutoff);while(cut<actualWake&&cut+DAY<=end)cut+=DAY;
      end=Math.min(end,cut);
    }
    return{wake:actualWake,end,minutes:Math.max(0,end-actualWake),lateAfterNoon,extended:lateAfterNoon&&end>standardEnd};
  }
  function quotaStatus(actual,target){actual=Math.max(0,Number(actual||0));target=Math.max(1,Number(target||1));const ratio=actual/target;return{actual,target,ratio,pct:Math.min(100,Math.round(ratio*100)),remaining:Math.max(0,target-actual),status:ratio>=1?'done':ratio>=.7?'attention':'behind'}}
  function goalHealth({actualMinutes=0,estimatedMinutes=0,startDate,dueDate,todayDate,behindMinutes=0}={}){
    actualMinutes=Math.max(0,Number(actualMinutes||0));estimatedMinutes=Math.max(1,Number(estimatedMinutes||1));behindMinutes=Math.max(0,Number(behindMinutes||0));
    const parse=s=>new Date(`${s}T12:00:00`).getTime(),day=86400000;
    if(!dueDate||!todayDate)return{status:'watch',label:'Monitorar',actualPct:Math.round(actualMinutes/estimatedMinutes*100),expectedPct:0,daysLeft:null};
    const start=parse(startDate||todayDate),now=parse(todayDate),due=parse(dueDate),span=Math.max(day,due-start),elapsed=clamp(now-start,0,span),expectedPct=Math.round(elapsed/span*100),actualPct=Math.round(actualMinutes/estimatedMinutes*100),daysLeft=Math.max(0,Math.ceil((due-now)/day)),gap=expectedPct-actualPct;
    let status='ok',label='No ritmo';
    if(daysLeft<=3&&(actualPct<85||behindMinutes>0)){status='critical';label='Crítica'}
    else if(behindMinutes>=60||gap>=20||(daysLeft<=7&&actualPct<65)){status='critical';label='Crítica'}
    else if(behindMinutes>0||gap>=10||(daysLeft<=14&&actualPct<50)){status='attention';label='Atenção'}
    return{status,label,actualPct,expectedPct,daysLeft,gap,behindMinutes};
  }
  function mergeById(a=[],b=[],key='id'){
    const m=new Map();for(const x of a||[])if(x&&x[key]!=null)m.set(String(x[key]),x);for(const x of b||[])if(x&&x[key]!=null)m.set(String(x[key]),Object.assign({},m.get(String(x[key]))||{},x));return[...m.values()]
  }
  function mergeMaps(a,b){return Object.assign({},a||{},b||{})}
  function smartMerge(local={},remote={}){
    const newer=(String(local?.syncMeta?.lastMutationAt||'')>=String(remote?.syncMeta?.lastMutationAt||''))?local:remote;
    const older=newer===local?remote:local;
    const out=Object.assign({},older,newer);
    for(const k of ['completed','xpLedger','bonusLedger','overrides','questPlans'])out[k]=mergeMaps(older[k],newer[k]);
    out.activityDates=[...new Set([...(older.activityDates||[]),...(newer.activityDates||[])])].sort();
    out.customQuests=mergeById(older.customQuests,newer.customQuests,'id');
    const lt=older.timeTracking||{},rt=newer.timeTracking||{};
    out.timeTracking=Object.assign({},lt,rt,{entries:mergeById(lt.entries,rt.entries,'id')});
    const la=older.adaptive||{},ra=newer.adaptive||{};
    out.adaptive=Object.assign({},la,ra,{history:mergeById(la.history,ra.history,'questId')});
    out.syncMeta=Object.assign({},older.syncMeta||{},newer.syncMeta||{}, {mergedAt:new Date().toISOString()});
    return out
  }
  function recommendRemoval(q={},ctx={}){
    if(q.fixedTime||q.essential||q.dailyMinimum)return{allowed:false,tone:'protect',reason:'É uma âncora protegida do dia. Removê-la quebraria uma restrição estrutural do Scheduler.'};
    const dueDays=Number.isFinite(ctx.daysToDue)?ctx.daysToDue:null,level=q.priorityLevel||(q.questType==='main'?'high':'normal');
    if(q.domain==='GSA'&&ctx.onlyDomainMission)return{allowed:true,tone:'warn',reason:'É a única missão GSA restante hoje. Você pode removê-la, mas o Scheduler tentará inserir outro avanço GSA no espaço liberado.'};
    if(q.domain==='Estudos'&&ctx.onlyDomainMission)return{allowed:true,tone:'warn',reason:'É a única sessão de Estudos restante hoje. Você pode removê-la, mas o Scheduler tentará preservar um mínimo de estudo no dia útil.'};
    if(level==='critical'||level==='high'||q.questType==='main'||(dueDays!==null&&dueDays<=3))return{allowed:true,tone:'warn',reason:'Esta missão está ligada a prioridade alta, Main Quest ou prazo próximo. Remover só faz sentido se ela realmente não for executável hoje; o objetivo principal continuará aberto.'};
    if(/lead/i.test(q.title||'')||/lead/i.test(q.description||''))return{allowed:true,tone:'ok',reason:'Se não existem leads pendentes, esta missão é condicional e pode sair do dia sem penalidade. O horário liberado será oferecido a outra missão.'};
    if(q.adaptiveSession||q.parentId)return{allowed:true,tone:'warn',reason:'Este é um bloco de progresso criado automaticamente para uma meta maior. Removê-lo afeta apenas hoje; a meta-mãe continua ativa e será redistribuída.'};
    return{allowed:true,tone:'ok',reason:'A remoção vale apenas para o planejamento de hoje: não conclui, não gera XP e não registra falha. O Scheduler usa o espaço liberado para a próxima prioridade viável.'}
  }
  function muayAllowed(weekday,{bniWednesday=true}={}){weekday=Number(weekday);if(weekday===3&&bniWednesday)return false;return weekday===1||weekday===5}
  return{computeLateWakeWindow,quotaStatus,goalHealth,smartMerge,recommendRemoval,muayAllowed};
});
