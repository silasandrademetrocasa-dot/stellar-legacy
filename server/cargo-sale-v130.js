/** Deterministic V130 cargo settlement, called only with server-owned cargo and prices. */
export function quoteCargoSaleV130(cargo,{resourceId='all',worldResources=[],catalog=[]}={}){
 const quantities=cargo&&typeof cargo==='object'?cargo:{};
 const resourceById=new Map(worldResources.filter(Boolean).map(r=>[String(r.resource_key||''),r]));
 const catalogById=new Map(catalog.filter(Boolean).map(r=>[String(r.catalog_key||r.key||'resource:'+String(r.ref_id||'')),r]));
 const ids=resourceId==='all'?Object.keys(quantities):[String(resourceId||'')];
 let total=0;const sold={};
 for(const rid of ids){
   const qty=Math.max(0,Math.floor(Number(quantities[rid])||0));
   if(!rid||rid==='Xenomit'||!qty)continue;
   const runtime=resourceById.get(rid);
   if(runtime?.enabled===false)continue;
   let unit=runtime?Math.max(0,Math.round(Number(runtime.sell_price)||0)):0;
   if(!runtime){
     const row=catalogById.get('resource:'+rid);
     if(row&&row.enabled!==false&&String(row?.meta?.mode||'sell')==='sell')unit=Math.max(0,Math.round(Number(row.price)||0));
   }
   if(!unit)continue;
   if(!Number.isSafeInteger(unit*qty))throw Object.assign(new Error('Valor do porão fora do limite seguro.'),{status:409,code:'SALE_OVERFLOW'});
   total+=unit*qty;
   if(!Number.isSafeInteger(total))throw Object.assign(new Error('Total da venda fora do limite seguro.'),{status:409,code:'SALE_OVERFLOW'});
   sold[rid]={qty,unit,total:unit*qty};
 }
 return {sold,total};
}
