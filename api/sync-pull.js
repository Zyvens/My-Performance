import {neonRpc} from '../server/neon-data-api.js';
export default async function handler(request,response){return neonRpc(request,response,'my_performance_pull',{});}
