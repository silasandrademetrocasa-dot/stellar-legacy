// V92/V97 • Compra em lote determinística; preço e estoque são confirmados pelo servidor.
export const BULK_MAX_UNITS=2000000;
export const BULK_MAX_PACKS=500;
export function quoteBulkPurchase({requested,packSize,packPrice}){
  if(!Number.isSafeInteger(Number(requested))||requested<1||requested>BULK_MAX_UNITS)
    throw new Error('Quantidade fora do limite de 1 a 2.000.000.');
  if(!Number.isSafeInteger(Number(packSize))||packSize<1||packSize>BULK_MAX_UNITS)
    throw new Error('Pacote publicado inválido.');
  if(!Number.isSafeInteger(Number(packPrice))||packPrice<1||packPrice>1000000000000)
    throw new Error('Preço publicado inválido.');
  const packages=Math.ceil(requested/packSize);
  if(packages>BULK_MAX_PACKS)throw new Error('Limite de 500 pacotes por compra.');
  const delivered=packages*packSize,price=packages*packPrice;
  if(!Number.isSafeInteger(delivered)||!Number.isSafeInteger(price)||price>1000000000000)
    throw new Error('Compra grande demais para uma operação.');
  return {requested,packSize,packPrice,packages,delivered,price};
}
