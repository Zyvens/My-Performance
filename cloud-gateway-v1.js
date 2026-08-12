"use strict";
(function(){
  const DATA_PREFIX='https://ep-fancy-wave-a6thlzk9.apirest.us-west-2.aws.neon.tech/neondb/rest/v1/rpc/';
  const nativeFetch=window.fetch.bind(window);
  const metrics={gateway:0,fallback:0,errors:0,lastRoute:'direct'};
  const routeFor=url=>url.endsWith('/my_performance_pull')?'/api/sync-pull':url.endsWith('/my_performance_push')?'/api/sync-push':'';
  window.fetch=async function(input,init){
    let request;
    try{request=new Request(input,init)}catch{return nativeFetch(input,init)}
    const route=request.url.startsWith(DATA_PREFIX)?routeFor(request.url):'';
    if(!route||request.method!=='POST')return nativeFetch(input,init);
    const auth=request.headers.get('authorization')||'';
    if(!auth.startsWith('Bearer '))return nativeFetch(input,init);
    try{
      const body=await request.clone().text();
      const response=await nativeFetch(route,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json','Accept':'application/json'},body:body||'{}',credentials:'same-origin',cache:'no-store'});
      if(response.status===404||response.status>=500)throw new Error(`gateway ${response.status}`);
      metrics.gateway++;metrics.lastRoute='vercel';return response;
    }catch(error){
      metrics.errors++;metrics.fallback++;metrics.lastRoute='direct-fallback';
      console.warn('Vercel sync gateway unavailable; using direct Neon fallback',String(error?.message||error));
      return nativeFetch(input,init);
    }
  };
  window.MyPerformanceCloudGateway={version:1,metrics:()=>({...metrics})};
})();
