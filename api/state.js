import { neon } from '@neondatabase/serverless';

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

function authorized(request){
  const expected=process.env.SYNC_KEY;
  if(!expected)return false;
  const received=request.headers.get('x-sync-key')||'';
  return received.length===expected.length&&received===expected;
}
function getProfile(request){
  const profile=new URL(request.url).searchParams.get('profile')||'vitor';
  return /^[a-zA-Z0-9_-]{1,64}$/.test(profile)?profile:null;
}
async function db(){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL não configurada.');
  const sql=neon(process.env.DATABASE_URL);
  await sql`
    CREATE TABLE IF NOT EXISTS my_performance_state (
      profile_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  return sql;
}

export default {
  async fetch(request){
    if(!authorized(request))return json({error:'Chave de sincronização inválida.'},401);
    const profile=getProfile(request);if(!profile)return json({error:'Perfil inválido.'},400);
    try{
      const sql=await db();
      if(request.method==='GET'){
        const rows=await sql`SELECT payload,updated_at FROM my_performance_state WHERE profile_id=${profile} LIMIT 1`;
        if(!rows.length)return json({found:false,profile});
        return json({found:true,profile,state:rows[0].payload,updatedAt:rows[0].updated_at});
      }
      if(request.method==='PUT'||request.method==='POST'){
        const raw=await request.text();if(raw.length>2_000_000)return json({error:'Estado maior que 2 MB.'},413);
        let body;try{body=JSON.parse(raw||'{}')}catch{return json({error:'JSON inválido.'},400)}
        const state=body?.state??body;
        if(!state||typeof state!=='object'||Array.isArray(state))return json({error:'Estado inválido.'},400);
        const rows=await sql`
          INSERT INTO my_performance_state(profile_id,payload,updated_at)
          VALUES(${profile},${JSON.stringify(state)}::jsonb,NOW())
          ON CONFLICT(profile_id)
          DO UPDATE SET payload=EXCLUDED.payload,updated_at=NOW()
          RETURNING updated_at
        `;
        return json({ok:true,profile,updatedAt:rows[0].updated_at});
      }
      if(request.method==='DELETE'){
        await sql`DELETE FROM my_performance_state WHERE profile_id=${profile}`;
        return json({ok:true,profile,deleted:true});
      }
      return json({error:'Método não permitido.'},405)
    }catch(error){
      console.error(error);return json({error:'Falha na sincronização com o banco.'},500)
    }
  }
};
