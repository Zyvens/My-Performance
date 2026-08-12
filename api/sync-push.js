import {neonRpc} from './_neon-data-api.js';
export default async function handler(request,response){const body=request.body&&typeof request.body==='object'?request.body:{};return neonRpc(request,response,'my_performance_push',{p_state:body.state||{}});}
