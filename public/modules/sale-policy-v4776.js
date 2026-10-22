// V47.7.6 — single authoritative resale rule, also used for the Hangar preview.
// A purchase in STL is NEVER refunded in STL. Its nominal price becomes CR,
// while purchases in CR refund 50% in CR. Never trust client-provided prices.
export function saleQuoteV4776(row){
  if(!row || row.enabled === false || !Number.isSafeInteger(Number(row.price)) || Number(row.price) <= 0)
    return {unit:0,currency:'credits',available:false,elite:false};
  const price=Math.floor(Number(row.price));
  const elite=String(row.currency||'credits')==='uridium';
  return {unit:elite?price:Math.max(1,Math.floor(price/2)),currency:'credits',available:true,elite};
}
