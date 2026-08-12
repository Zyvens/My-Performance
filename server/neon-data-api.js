const DEFAULT_DATA_API_URL='https://ep-fancy-wave-a6thlzk9.apirest.us-west-2.aws.neon.tech/neondb/rest/v1';

function bearer(request){
  const value=String(request.headers?.authorization||'');
  if(!value.startsWith('Bearer ')||value.length<20)return '';
  return value;
}

export async function neonRpc(request,response,rpcName,args={}){
  response.setHeader('Cache-Control','no-store');
  response.setHeader('X-Content-Type-Options','nosniff');
  if(request.method!=='POST'){
    response.setHeader('Allow','POST');
    return response.status(405).json({message:'method_not_allowed'});
  }
  const authorization=bearer(request);
  if(!authorization)return response.status(401).json({message:'authentication_required'});
  const base=String(process.env.NEON_DATA_API_URL||DEFAULT_DATA_API_URL).replace(/\/$/,'');
  try{
    const upstream=await fetch(`${base}/rpc/${rpcName}`,{
      method:'POST',
      headers:{Authorization:authorization,'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(args||{}),
      signal:AbortSignal.timeout(10000)
    });
    const text=await upstream.text();
    response.status(upstream.status);
    response.setHeader('Content-Type',upstream.headers.get('content-type')||'application/json; charset=utf-8');
    return response.send(text);
  }catch(error){
    console.error('Neon Data API gateway failure',{rpcName,message:String(error?.message||error)});
    return response.status(502).json({message:'neon_gateway_unavailable'});
  }
}
