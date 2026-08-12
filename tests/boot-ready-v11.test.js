const fs=require('fs'),assert=require('assert');
const index=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('boot-ready-v11.css','utf8'),js=fs.readFileSync('boot-ready-v11.js','utf8');
assert(index.includes('<html lang="pt-BR" class="mp-booting"'));assert(index.includes('boot-ready-v11.css'));assert(index.includes('boot-ready-v11.js'));assert(index.lastIndexOf('boot-ready-v11.js')>index.lastIndexOf('runtime-stability-v5.js'));
assert(css.includes('html.mp-booting .app-shell'));assert(css.includes('Carregando Planner'));
for(const t of ["typeof render==='function'","classList.remove('mp-booting')","dataset.runtimeReady='1'",'my-performance-runtime-ready'])assert(js.includes(t),`boot invariant missing ${t}`);
console.log('Final-render boot gate V11 passed');
