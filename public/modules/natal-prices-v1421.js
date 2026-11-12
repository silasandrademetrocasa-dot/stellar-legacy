// No static fallback: never display one price while authorizing another.
export function natalDesignQuoteV1421(status,designId){
 const value=status?.design_prices?.[designId];
 return Number.isSafeInteger(value)&&value>0?value:null;
}
