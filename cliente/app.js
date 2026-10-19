'use strict';

const API='https://script.google.com/macros/s/AKfycbyIKqympKP_yxyabDKIIz-50rMBNJekjV9eqY2qNyasaw4kpsqIaRIuKIeKzGpCeGgW/exec';
const el=id=>document.getElementById(id);
const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const usd=n=>typeof n==='number'?new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(n):'Por confirmar';
const flower='<svg viewBox="0 0 100 100" fill="none"><path d="M50 34C20-2 0 35 29 50 0 74 31 102 50 70c21 34 53 4 23-20 32-20 1-52-23-16Z" fill="#edc7d7"/><circle cx="50" cy="51" r="10" fill="#bb7c93"/><path d="m50 70 3 27M53 86c20-17 34-6 15 5" stroke="#9eae87" stroke-width="3"/></svg>';

document.querySelectorAll('.float-flower').forEach(node=>{node.innerHTML=flower;});

function jsonp(code){
  return new Promise((resolve,reject)=>{
    const callback='carino_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
    const script=document.createElement('script');
    let timer;
    const cleanup=()=>{clearTimeout(timer);delete window[callback];script.remove();};
    window[callback]=payload=>{cleanup();payload&&payload.ok?resolve(payload.order):reject(new Error(payload&&payload.error||'No pudimos consultar tu pedido.'));};
    script.onerror=()=>{cleanup();reject(new Error('No pudimos conectar con el estado del pedido. Inténtalo nuevamente.'));};
    script.src=API+'?mode=lookup&callback='+encodeURIComponent(callback)+'&code='+encodeURIComponent(code);
    timer=setTimeout(()=>{cleanup();reject(new Error('La consulta tardó demasiado. Inténtalo nuevamente.'));},15000);
    document.head.appendChild(script);
  });
}

function renderResult(order){
  const labels=['Recibido','En cola','Elaborando','Listo','Enviado','Entregado'];
  const states=['Recibido','En cola','En elaboración','Listo para entrega','Enviado','Entregado'];
  const step=states.indexOf(order.status);
  const special=['Cancelado','En pausa','Esperando anticipo'].includes(order.status);
  const due=order.due?new Date(order.due).toLocaleDateString('es-EC',{day:'numeric',month:'long'}):'Por confirmar';
  const queued=Number.isInteger(order.turn)&&order.turn>0;
  el('tracking-result').innerHTML=`<span class="ribbon" aria-hidden="true">♡</span><div class="result-head"><div><span class="eyebrow">Tu pedido</span><h2 style="margin-top:6px">${escapeText(order.status)}</h2><p>Actualizado desde nuestro taller</p></div></div>${special?`<div class="message">${order.status==='Cancelado'?'Este pedido fue cancelado. Si necesitas revisar una devolución, comunícate con Cariño.':order.status==='Esperando anticipo'?'Estamos esperando el anticipo para reservar tu lugar en producción.':'Tu pedido está en pausa. Te contactaremos para coordinar los siguientes pasos.'}</div>`:`<div class="timeline" aria-label="Progreso del pedido">${labels.map((label,index)=>`<div class="step ${index<step?'complete':index===step?'current':''}"><i>${index<step?'✓':index+1}</i>${label}</div>`).join('')}</div>`}<div class="customer-stats"><div class="customer-stat"><small>Pedidos delante del tuyo</small><strong>${queued?String(order.ahead):['Listo para entrega','Enviado','Entregado'].includes(order.status)?'¡Ya está listo!':'Aún sin turno'}</strong><p>${queued?'Tu turno actual es el '+order.turn+'.':'Consulta el estado para saber el siguiente paso.'}</p></div><div class="customer-stat"><small>Entrega prevista</small><strong>${escapeText(due)}</strong><p>Fecha prevista para recibir tu regalo.</p></div></div><h3 style="margin-top:26px">Hecho para ti</h3>${order.items.map(item=>`<div class="gift-line"><span>${escapeText(item.name)}</span><strong>× ${item.quantity}</strong></div>`).join('')}<div style="margin-top:20px"><div class="payment-line"><span>Total de tu pedido</span><strong>${usd(order.total)}</strong></div><div class="payment-line"><span>Abonado</span><strong>${usd(order.paid)}</strong></div><div class="payment-line"><span>Pendiente de pago</span><strong>${usd(order.balance)}</strong></div><p class="hint">${escapeText(order.paymentState)}</p></div>${order.message?`<div class="message">♡ ${escapeText(order.message)}</div>`:''}<p class="hint">La cola sigue la fecha y hora de registro de los pedidos confirmados. Al quedar listo uno, los siguientes avanzan.</p>`;
  el('tracking-result').hidden=false;
}

let busy=false;
el('lookup-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy)return;
  const code=el('order-code').value.trim().toUpperCase();
  el('lookup-error').hidden=true;
  el('tracking-result').hidden=true;
  if(!/^CAR-[A-HJ-NP-Z2-9]{8}$/.test(code)){
    el('lookup-error').textContent='Revisa el código. Debe comenzar con CAR- y tener 8 letras o números.';
    el('lookup-error').hidden=false;
    return;
  }
  busy=true;el('lookup-button').disabled=true;el('loading').hidden=false;
  try{
    const order=await jsonp(code);
    if(!order)throw new Error('No encontramos un pedido disponible con ese código. Revisa el mensaje de confirmación o consulta con Cariño.');
    renderResult(order);
  }catch(error){
    el('lookup-error').textContent=error.message||'No pudimos consultar tu pedido. Inténtalo de nuevo.';
    el('lookup-error').hidden=false;
  }finally{
    busy=false;el('lookup-button').disabled=false;el('loading').hidden=true;
  }
});
