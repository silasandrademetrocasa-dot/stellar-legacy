// Image coordinates: north is -Y, east is +X. Frame 0 north; frames progress clockwise.
export const TWO_PI = 2 * Math.PI;
export function directionalIndex(angle,frameCount=16){
  if(![16,32].includes(frameCount))throw new RangeError('Expected 16 or 32 directions');
  const value=Number.isFinite(angle)?angle:-Math.PI/2;
  return ((Math.round((value+Math.PI/2)/(TWO_PI/frameCount))%frameCount)+frameCount)%frameCount;
}
export function directionalGrid(frameCount){
  if(frameCount===16)return {cols:4,rows:4,frames:16};
  if(frameCount===32)return {cols:8,rows:4,frames:32};
  throw new RangeError('Invalid directional grid');
}
export function directionalGridForImage(width,height){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new RangeError('Invalid image');
  const count=width/height>=1.7?32:16;
  return directionalGrid(count);
}
export function facingAngle(fromX,fromY,toX,toY){return Math.atan2(toY-fromY,toX-fromX);}
