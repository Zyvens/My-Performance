"use strict";
/* Calendar V5 modal presentation/accessibility enhancer. No scheduling logic. */
(function(){
  const host=document.getElementById('modal');
  if(!host)return;
  let escBound=false;
  function close(){document.getElementById('v5Close')?.click()}
  function syncBody(){document.body.classList.toggle('modal-open',!!host.querySelector('.modal-backdrop'))}
  function enhanceColor(input){
    if(input.dataset.colorInfo==='1')return;
    input.dataset.colorInfo='1';
    const info=document.createElement('div');info.className='color-value';info.setAttribute('aria-live','polite');
    const swatch=document.createElement('span');swatch.className='color-value-swatch';
    const label=document.createElement('span');label.textContent='Cor selecionada';
    const code=document.createElement('span');code.className='color-value-code';
    info.append(swatch,label,code);input.insertAdjacentElement('afterend',info);
    const update=()=>{const value=String(input.value||'#45b97c').toUpperCase();swatch.style.setProperty('--selected-color',value);code.textContent=value;input.setAttribute('aria-label',`Cor selecionada ${value}`)};
    input.addEventListener('input',update);input.addEventListener('change',update);update();
  }
  function enhance(){
    const backdrop=host.querySelector('.modal-backdrop'),card=host.querySelector('.calendar-modal');syncBody();if(!backdrop||!card)return;
    card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
    const heading=card.querySelector('h2');if(heading){if(!heading.id)heading.id='v5ModalTitle';card.setAttribute('aria-labelledby',heading.id)}
    backdrop.onclick=e=>{if(e.target===backdrop)close()};
    card.querySelectorAll('input[type="color"]').forEach(enhanceColor);
    if(!escBound){document.addEventListener('keydown',e=>{if(e.key==='Escape'&&host.querySelector('.modal-backdrop'))close()});escBound=true}
    requestAnimationFrame(()=>{const first=card.querySelector('input:not([type="hidden"]),select,textarea,button:not(.modal-close)');first?.focus?.({preventScroll:true})});
  }
  new MutationObserver(enhance).observe(host,{childList:true,subtree:true});
  enhance();
  window.MyPerformanceModalUI={VERSION:5,enhance};
})();
