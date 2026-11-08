'use strict';
const DASHBOARD_API='https://script.google.com/macros/s/AKfycbyIKqympKP_yxyabDKIIz-50rMBNJekjV9eqY2qNyasaw4kpsqIaRIuKIeKzGpCeGgW/exec';
const $=id=>document.getElementById(id);
const money=n=>typeof n==='number'?new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(n):'Por definir';
const date=d=>d?new Date(d).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'}):'Por confirmar';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8C5 8 5 2 8 3c3 0 4 5 4 5Zm0 0c7 0 7-6 4-5-3 0-4 5-4 5Z"/>',wallet:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8h17m1 4h-6v5h6"/>',flower:'<path d="M12 8c-6-8-12 1-5 4-8 6 2 12 5 5 4 8 13 1 5-5 8-4 0-12-5-4Z"/><circle cx="12" cy="12" r="2"/>',refresh:'<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',sparkle:'<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z"/>',heart:'<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 0 9 8 15 8-6 12-11 8-15Z"/>'};
paths.calendar='<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h2m4 0h2m-8 3h2"/>';
paths.previous='<path d="m15 6-6 6 6 6"/>';
paths.next='<path d="m9 6 6 6-6 6"/>';
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.heart}</svg>`;}
document.querySelectorAll('[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));
let state=null;let toastTimer;
function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function badge(s){return `<span class="badge ${s==='Entregado'?'done':s==='Listo para entrega'?'ready':['Recibido','Esperando anticipo','En pausa'].includes(s)?'wait':s==='Cancelado'?'cancel':''}">${esc(s)}</span>`;}
function kpi(label,n,note,type='money'){return `<article class="kpi"><span class="round-icon">${icon(type==='count'?'gift':'heart')}</span><span class="k-label">${label}</span><strong>${type==='count'?n:money(n)}</strong><small>${note}</small></article>`;}
function navigate(next){
  document.querySelectorAll('.page').forEach(e=>e.hidden=e.id!=='page-'+next);
  document.querySelectorAll('.nav button').forEach(e=>{
    e.classList.toggle('active',e.dataset.page===next);
    e.setAttribute('aria-current',e.dataset.page===next?'page':'false');
  });
  $('dashboard-heading').hidden=next==='calendar';
  if(next==='calendar'){
    renderCalendar();
    return;
  }
  $('page-title').textContent={overview:'Una mirada a tu negocio',orders:'Cada pedido tiene una historia',expenses:'Tus gastos, en orden',catalog:'Detalles que enamoran'}[next];
  $('period-description').textContent=next==='orders'?'Pedidos recibidos en el período seleccionado.':next==='catalog'?'Elige una categoría al registrar cada producto.':'Ventas por fecha de pedido. La caja se calcula con los pagos y gastos registrados.';
  render();
}
document.querySelectorAll('[data-page],[data-go]').forEach(e=>e.addEventListener('click',()=>navigate(e.dataset.page||e.dataset.go)));

const calendarToday=new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Guayaquil',year:'numeric',month:'2-digit',day:'2-digit'
});
const monthYearFormat=new Intl.DateTimeFormat('es-EC',{timeZone:'UTC',month:'long',year:'numeric'});
const monthFormat=new Intl.DateTimeFormat('es-EC',{timeZone:'UTC',month:'long'});
const dayFormat=new Intl.DateTimeFormat('es-EC',{timeZone:'UTC',dateStyle:'full'});
const deliveryFormat=new Intl.DateTimeFormat('es-EC',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'});
const calendarDate=(year,month,day=1)=>new Date(Date.UTC(year,month,day));
const dateKey=d=>d.toISOString().slice(0,10);
const parseDay=key=>new Date(key+'T00:00:00Z');
const pendingLabel=n=>n===1?'1 pedido pendiente':`${n} pedidos pendientes`;

function todayKey(){
  const parts=calendarToday.formatToParts(new Date());
  const {year,month,day}=Object.fromEntries(parts.map(({type,value})=>[type,value]));
  return `${year}-${month}-${day}`;
}

let calendarMonth=parseDay(todayKey());
calendarMonth.setUTCDate(1);
let calendarView='month';
let calendarLoadFailed=false;
let pendingByDate=new Map();

function deliveryKey(due){
  const key=typeof due==='string'?due.slice(0,10):'';
  const day=parseDay(key);
  return Number.isFinite(day.getTime())&&dateKey(day)===key?key:'';
}

function deliveryDate(due){
  const key=deliveryKey(due);
  return key?deliveryFormat.format(parseDay(key)):'Por confirmar';
}

function groupPendingOrders(orders){
  const groups=new Map();
  for(const order of orders){
    if(Carino.terminal(order.status))continue;
    const key=deliveryKey(order.due);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(order);
  }
  return groups;
}

function pendingCount(prefix){
  let total=0;
  for(const [key,orders] of pendingByDate){
    if(key.startsWith(prefix))total+=orders.length;
  }
  return total;
}

function calendarDays(month,today,mini=false){
  const weekdays=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const short=['L','M','X','J','V','S','D'];
  const header=weekdays.map((day,i)=>`<abbr title="${day}">${mini?short[i]:day.slice(0,3)}</abbr>`).join('');
  const year=month.getUTCFullYear(),index=month.getUTCMonth();
  const offset=(month.getUTCDay()+6)%7;
  const last=calendarDate(year,index+1,0).getUTCDate();
  const cells=mini?42:7*Math.ceil((offset+last)/7);
  const days=Array.from({length:cells},(_,i)=>{
    const day=i-offset+1;
    const valid=day>=1&&day<=last;
    if(!valid)return mini?'<span class="calendar-mini-day"></span>':'<div class="calendar-day is-blank" aria-hidden="true"></div>';
    const current=calendarDate(year,index,day);
    const key=dateKey(current);
    const count=pendingByDate.get(key)?.length||0;
    const isToday=key===today;
    if(mini){
      return `<span class="calendar-mini-day${count?' has-orders':''}${isToday?' is-today':''}">${day}</span>`;
    }
    const number=`<span class="calendar-day-number">${day}</span>`;
    const todayAttribute=isToday?' aria-current="date"':'';
    if(!count)return `<div class="calendar-day"${todayAttribute}>${number}</div>`;
    return `<button class="calendar-day has-orders" data-calendar-date="${key}"${todayAttribute}
      aria-label="${dayFormat.format(current)}, ${pendingLabel(count)}">${number}<span class="calendar-count">${count}</span></button>`;
  }).join('');
  const container=mini?'span':'div';
  return `<${container} class="calendar-week">${header}</${container}><${container} class="calendar-days">${days}</${container}>`;
}

function calendarYear(year,today){
  const months=Array.from({length:12},(_,i)=>{
    const month=calendarDate(year,i);
    const key=dateKey(month).slice(0,7);
    const count=pendingCount(key);
    const label=`${monthFormat.format(month)}, ${pendingLabel(count)}`;
    return `<button class="calendar-month-card${today.startsWith(key)?' is-current':''}" data-calendar-month="${i}" aria-label="Abrir ${label}">
      <span class="calendar-month-heading"><span class="calendar-month-name">${monthFormat.format(month)}</span>
      ${count?`<span class="calendar-count">${count}</span>`:''}</span>
      <span aria-hidden="true">${calendarDays(month,today,true)}</span></button>`;
  });
  return `<div class="calendar-year-grid">${months.join('')}</div>`;
}

function renderCalendar(){
  const annual=calendarView==='year';
  const year=calendarMonth.getUTCFullYear();
  const today=todayKey();
  const period=annual?year:monthYearFormat.format(calendarMonth);
  if($('calendar-period').textContent!==String(period))$('calendar-period').textContent=period;
  $('calendar-description').textContent=annual?'Elige un mes para ver sus días y pedidos pendientes.':'Toca un número rosa para ver los pedidos pendientes de ese día.';
  $('calendar-month').setAttribute('aria-pressed',String(!annual));
  $('calendar-year').setAttribute('aria-pressed',String(annual));
  $('calendar-prev').setAttribute('aria-label',annual?'Año anterior':'Mes anterior');
  $('calendar-next').setAttribute('aria-label',annual?'Año siguiente':'Mes siguiente');
  $('calendar-grid').innerHTML=annual?calendarYear(year,today):calendarDays(calendarMonth,today);

  const undated=pendingByDate.get('')?.length||0;
  $('calendar-undated').hidden=!undated;
  $('calendar-undated').textContent=`${pendingLabel(undated)} sin fecha de entrega`;
  if(!state){
    $('calendar-status').textContent=calendarLoadFailed?'No se pudieron cargar los pedidos. Pulsa Actualizar para reintentar.':'Cargando pedidos…';
    return;
  }
  const prefix=annual?String(year):dateKey(calendarMonth).slice(0,7);
  const summary=`${pendingLabel(pendingCount(prefix))} en este ${annual?'año':'mes'}.`;
  $('calendar-status').textContent=calendarLoadFailed?summary+' Se muestra la última carga.':summary;
}

function moveCalendar(direction){
  const year=calendarMonth.getUTCFullYear(),month=calendarMonth.getUTCMonth();
  calendarMonth=calendarView==='year'?calendarDate(year+direction,month):calendarDate(year,month+direction);
  renderCalendar();
}

function setCalendarView(view){
  if(view===calendarView)return;
  calendarView=view;
  renderCalendar();
}

function showCalendarOrders(day,returnCode){
  const orders=pendingByDate.get(day);
  if(!orders?.length)return;
  const title=day?dayFormat.format(parseDay(day)):'Pedidos sin fecha de entrega';
  $('detail-content').innerHTML=`<span class="eyebrow">Agenda de entregas</span>
    <h2 class="calendar-dialog-title" id="detail-title" tabindex="-1">${title}</h2>
    <p class="calendar-dialog-count">${pendingLabel(orders.length)}</p>
    <ul class="calendar-order-list">${orders.map(o=>{
      const gifts=o.items.map(i=>i.description).join(' · ');
      return `<li><button class="calendar-order" data-detail="${esc(o.code)}" data-order-day="${day}">
        <span class="calendar-order-info"><strong>${esc(o.client)}</strong>
        <small>${esc(gifts||o.code)}</small>${badge(o.status)}</span>${icon('next')}</button></li>`;
    }).join('')}</ul>`;
  if(!$('detail').open)$('detail').showModal();
  const previous=Array.from($('detail-content').querySelectorAll('[data-detail]')).find(b=>b.dataset.detail===returnCode);
  (previous||$('detail-title')).focus();
}

$('calendar-prev').onclick=()=>moveCalendar(-1);
$('calendar-next').onclick=()=>moveCalendar(1);
$('calendar-today').onclick=()=>{
  calendarMonth=parseDay(todayKey());
  calendarMonth.setUTCDate(1);
  renderCalendar();
};
$('calendar-month').onclick=()=>setCalendarView('month');
$('calendar-year').onclick=()=>setCalendarView('year');
$('calendar-undated').onclick=()=>showCalendarOrders('');
$('calendar-grid').addEventListener('click',event=>{
  const day=event.target.closest('[data-calendar-date]');
  if(day)showCalendarOrders(day.dataset.calendarDate);
  const month=event.target.closest('[data-calendar-month]');
  if(month){
    calendarMonth=calendarDate(calendarMonth.getUTCFullYear(),Number(month.dataset.calendarMonth));
    setCalendarView('month');
    $('calendar-period').focus();
  }
});

function orderRow(o,full=false){const item=o.items.map(i=>i.description).join(' · ');return `<tr><td><div class="client-name" title="${esc(o.client)}">${esc(o.client)}</div><div class="sub" title="${esc(item)}">${esc(item)}</div></td><td>${full?date(o.date):deliveryDate(o.due)}</td><td>${badge(o.status)}</td>${full?`<td class="num">${money(o.total)}</td><td class="num">${money(o.paid)}</td>`:''}<td class="num">${money(o.balance)}</td><td><button class="link-btn" data-detail="${esc(o.code)}" aria-label="Ver pedido de ${esc(o.client)}">Ver →</button></td></tr>`;}
function renderOrders(){const start=$('start').value,end=$('end').value,q=$('search').value.toLowerCase(),status=$('status-filter').value;const selected=state.orders.filter(o=>Carino.inPeriod(o.date,start,end)&&(!status||o.status===status)&&[o.client,o.code,...o.items.map(i=>i.description)].join(' ').toLowerCase().includes(q));$('order-table').innerHTML=selected.map(o=>orderRow(o,true)).join('')||'<tr><td colspan="7" class="empty">No hay pedidos con estos filtros.</td></tr>';$('order-count').textContent=`(${state.orders.length})`;$('order-result').textContent=`${selected.length} ${selected.length===1?'pedido':'pedidos'} en esta vista`;}
function chart(start,end){const series=[];let cursor=new Date(start+'T12:00:00');cursor.setDate(1);let limit=0;while(cursor.toISOString().slice(0,10)<=end&&limit++<24){const a=cursor.toISOString().slice(0,10);const last=new Date(cursor.getFullYear(),cursor.getMonth()+1,0,12).toISOString().slice(0,10);const b=last<end?last:end;const m=Carino.metrics(state,a<start?start:a,b);series.push({label:cursor.toLocaleDateString('es-EC',{month:'short',year:'2-digit'}),sales:m.sales,expenses:m.expenses});cursor.setMonth(cursor.getMonth()+1);}const max=Math.max(10,...series.flatMap(s=>[s.sales,s.expenses]));const W=560,H=220,left=42,bottom=185,top=15,step=(W-left-12)/Math.max(1,series.length);let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas registradas y gastos por mes"><title>Ventas registradas y gastos generales por mes</title>`;for(let i=0;i<=4;i++){const y=bottom-i*(bottom-top)/4;svg+=`<line x1="${left}" y1="${y}" x2="552" y2="${y}" stroke="#f0e6eb" stroke-dasharray="3 4"/><text x="${left-9}" y="${y+4}" text-anchor="end">$${Math.round(max*i/4)}</text>`;}series.forEach((s,i)=>{const x=left+step*(i+.5),width=Math.min(42,step*.25);for(const[key,offset,color]of[['sales',-width-3,'#c37994'],['expenses',3,'#d5c7e5']]){const h=s[key]/max*(bottom-top);svg+=`<rect x="${x+offset}" y="${bottom-h}" width="${width}" height="${h}" rx="5" fill="${color}"><title>${esc(s.label)}: ${key==='sales'?'ventas':'gastos'} ${money(s[key])}</title></rect>`;}svg+=`<text x="${x}" y="211" text-anchor="middle">${esc(s.label)}</text>`;});$('chart').innerHTML=svg+'</svg>';}
function render(){if(!state)return;const start=$('start').value,end=$('end').value;if(!start||!end||start>end){toast('Elige un período válido: la fecha inicial debe ser anterior a la final.');return;}const m=Carino.metrics(state,start,end);
$('kpis').innerHTML=kpi('Ingresos brutos',m.gross,'Pedidos registrados + cancelaciones retenidas')+kpi('Gastos generales',m.expenses,'Compras registradas en el período')+kpi('Resultado neto',m.net,'Ingresos brutos menos gastos generales')+kpi('Por cobrar ahora',m.balance,'Saldo actual de todos los pedidos');
const counts={};state.orders.filter(o=>!Carino.terminal(o.status)).forEach(o=>counts[o.status]=(counts[o.status]||0)+1);$('status-list').innerHTML=Object.entries(counts).map(([s,n])=>`<div class="status-row"><i class="status-dot"></i><span>${esc(s)}</span><strong>${n}</strong></div>`).join('')||'<p class="empty">Todo entregado. Un momento para celebrar.</p>';const recent=state.orders.filter(o=>!Carino.terminal(o.status)).sort((a,b)=>(a.due||'').localeCompare(b.due||''));$('recent-orders').innerHTML=recent.slice(0,5).map(o=>orderRow(o)).join('')||'<tr><td colspan="5" class="empty">No hay pedidos abiertos.</td></tr>';chart(start,end);renderOrders();
$('cash-kpis').innerHTML=kpi('Cobros del período',m.collected,'Pago restante agrupado por entrega')+kpi('Gastos pagados',m.cashOut,'Compras y gastos generales del período')+kpi('Caja estimada',m.cash,'Cobros del período menos gastos')+kpi('Compras registradas',m.purchases,'Una fila por compra','count');$('expense-table').innerHTML=state.expenses.filter(e=>Carino.inPeriod(e.date,start,end)).map(e=>`<tr><td>${date(e.date)}</td><td><div class="client-name">${esc(e.description)}</div></td><td class="num">${money(e.amount)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">Sin gastos en este período.</td></tr>';
$('expense-note').textContent=state.expenseNote||'';$('expense-note').hidden=!state.expenseNote;
$('catalog-grid').innerHTML=state.catalog.map(c=>`<article class="product-card"><div class="flower">${icon('flower')}</div><h3>${esc(c.categoria)}</h3><p>${esc(c.notas)}</p><span class="price">${['desde','referencia_variable'].includes(c.tipo_precio)?'Desde / ref. ':''}${money(c.precio)}</span></article>`).join('');}
function detail(code,day){
  const o=state?.orders.find(order=>order.code===code);
  if(!o)return;
  const back=day===undefined?'':'<button class="link-btn calendar-back" id="calendar-back">← Volver a los pedidos</button>';
  $('detail-content').innerHTML=`${back}<span class="eyebrow">Un pedido con cariño</span>
    <h2 class="calendar-dialog-title" id="detail-title" tabindex="-1">${esc(o.client)}</h2>${badge(o.status)}
    <div class="detail-grid"><div><span>Entrega prevista</span>${deliveryDate(o.due)}</div>
    <div><span>Pago</span>${esc(o.paymentState)}</div>
    <div><span>Total</span><strong>${money(o.total)}</strong></div>
    <div><span>Pendiente de pago</span><strong>${money(o.balance)}</strong></div>
    <div><span>Turno en producción</span>${o.turn===null?'Fuera de cola':o.turn}</div>
    <div><span>Pedidos delante</span>${o.ahead===null?'Aún fuera de cola':o.ahead}</div></div>
    <h3>Sus regalos</h3>${o.items.map(i=>`<div class="gift-line"><span>${esc(i.description)} × ${i.qty}</span><strong>${money(i.total)}</strong></div>`).join('')}
    <p class="hint">Consulta del cliente: ${o.public==='Sí'?'habilitada':'desactivada hasta revisar los datos'}.</p>
    <code class="code-box">${esc(o.code)}</code><button class="btn" id="copy-code" style="margin-top:10px">Copiar código</button>
    ${o.notes?`<p class="notice">${esc(o.notes)}</p>`:''}`;
  if(!$('detail').open)$('detail').showModal();
  $('detail-title').focus();
  if(back)$('calendar-back').onclick=()=>showCalendarOrders(day,code);
  $('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(o.code);toast('Código copiado.');}catch{toast('Selecciona el código para copiarlo.');}};
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-detail]');
  if(b)detail(b.dataset.detail,b.dataset.orderDay);
});
$('detail').querySelector('.close').onclick=()=>$('detail').close();
$('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close();});
$('search').addEventListener('input',()=>{if(state)renderOrders();});
$('status-filter').addEventListener('change',()=>{if(state)renderOrders();});
$('start').addEventListener('change',render);
$('end').addEventListener('change',render);
function requestDashboard(){return new Promise((resolve,reject)=>{const callback='carino_admin_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);const script=document.createElement('script');const timer=setTimeout(()=>{cleanup();reject(new Error('La conexión tardó demasiado.'));},20000);const cleanup=()=>{clearTimeout(timer);delete window[callback];script.remove();};window[callback]=payload=>{cleanup();payload&&payload.ok?resolve(payload.data):reject(new Error(payload&&payload.error||'No se pudo abrir el dashboard.'));};script.onerror=()=>{cleanup();reject(new Error('No se pudo conectar con Google Sheets.'));};script.src=DASHBOARD_API+'?mode=dashboard&callback='+encodeURIComponent(callback);document.head.appendChild(script);});}
async function load(){
  const buttons=[$('refresh'),$('calendar-refresh')];
  buttons.forEach(b=>b.disabled=true);
  clearTimeout(toastTimer);
  $('toast').hidden=true;
  if(!state){
    calendarLoadFailed=false;
    renderCalendar();
  }
  try{
    const d=await requestDashboard();
    if(!d)throw new Error('No hay datos disponibles.');
    const firstLoad=!state;
    state=Carino.calculate(d);
    pendingByDate=groupPendingOrders(state.orders);
    if(firstLoad){
      const today=todayKey();
      const historyDates=[...state.orders.map(o=>o.date),...state.expenses.map(e=>e.date),...state.payments.map(p=>p.date)].filter(Boolean).map(d=>d.slice(0,10));
      $('start').value=historyDates.length?historyDates.sort()[0]:today;
      $('end').value=today;
    }
    calendarLoadFailed=false;
    $('connection').innerHTML='<i></i>Google Sheets';
    $('updated').textContent='Actualizado '+new Date().toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'});
    const current=$('status-filter').value;
    $('status-filter').innerHTML='<option value="">Todos los estados</option>'+[...new Set(state.orders.map(o=>o.status))].map(s=>`<option>${esc(s)}</option>`).join('');
    $('status-filter').value=current;
    render();
  }catch(e){
    calendarLoadFailed=true;
    $('connection').textContent='Sin conexión';
    toast('No se pudieron cargar los datos. '+e.message);
  }finally{
    renderCalendar();
    buttons.forEach(b=>b.disabled=false);
  }
}
$('refresh').onclick=load;
$('calendar-refresh').onclick=load;
load();
