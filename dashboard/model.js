(function(root){
  'use strict';
  const round=n=>Math.round((n+Number.EPSILON)*100)/100;
  const number=n=>typeof n==='number'&&Number.isFinite(n);
  const value=n=>number(n)?n:0;
  const active=s=>['En cola','En elaboración'].includes(s);
  const terminal=s=>['Entregado','Cancelado'].includes(s);
  const inPeriod=(d,start,end)=>!!d&&d.slice(0,10)>=start&&d.slice(0,10)<=end;
  function calculate(data){
    const orders=data.orders.map(o=>{
      const items=data.items.filter(i=>i.code===o.code).map(i=>{const price=number(i.agreed_price)?i.agreed_price:i.catalog_price;return {...i,price,total:number(price)&&number(i.qty)?round(price*i.qty):null};});
      const payments=data.payments.filter(p=>p.code===o.code);
      const total=items.length&&items.every(i=>number(i.total))?round(items.reduce((n,i)=>n+i.total,0)+value(o.shipping)-value(o.discount)):null;
      const paid=round(payments.reduce((n,p)=>n+(p.type==='Devolución'?-1:1)*value(p.amount),0));
      const canceled=o.status==='Cancelado';
      const balance=canceled?0:number(total)?round(Math.max(0,total-paid)):null;
      const deposit=number(total)?round(total*data.deposit):null;
      const turn=active(o.status)&&number(total)&&total>0&&paid>=deposit&&number(o.turn)&&o.turn>0?o.turn:null;
      const ahead=turn===null?null:turn-1;
      const paymentState=canceled?'Cancelado':!number(total)||total<=0?'Por revisar':paid>total?'Sobrepago':paid===total?'Pagado':paid>=deposit?'Anticipo recibido':paid>0?'Abono parcial':'Sin pago';
      const lead=o.date&&o.due?(Date.parse(o.due)-Date.parse(o.date))/3600000:null;
      return {...o,items,payments,total,paid,balance,deposit,depositDue:canceled?0:number(deposit)?round(Math.max(0,deposit-paid)):null,turn,ahead,paymentState,lead};
    });return {...data,orders};
  }
  function metrics(data,start,end){
    const delivered=data.orders.filter(o=>o.status==='Entregado'&&inPeriod(o.closed,start,end));
    const canceled=data.orders.filter(o=>o.status==='Cancelado'&&inPeriod(o.closed,start,end));
    const sales=round(delivered.reduce((n,o)=>n+value(o.total),0));
    const cancel=round(canceled.reduce((n,o)=>n+o.paid,0));
    const expenses=round(data.expenses.filter(e=>inPeriod(e.date,start,end)).reduce((n,e)=>n+value(e.amount),0));
    const collected=round(data.payments.filter(p=>inPeriod(p.date,start,end)).reduce((n,p)=>n+(p.type==='Devolución'?-1:1)*value(p.amount),0));
    return {sales,gross:round(sales+cancel),cancel,expenses,net:round(sales+cancel-expenses),collected,cashOut:expenses,cash:round(collected-expenses),open:data.orders.filter(o=>!terminal(o.status)).length,balance:round(data.orders.reduce((n,o)=>n+value(o.balance),0)),unpriced:delivered.filter(o=>!number(o.total)).length,provisional:data.orders.filter(o=>o.notes).length,delivered:delivered.length,purchases:data.expenses.filter(e=>inPeriod(e.date,start,end)).length};
  }
  root.Carino={calculate,metrics,inPeriod,round,active,terminal};
})(typeof window!=='undefined'?window:globalThis);
