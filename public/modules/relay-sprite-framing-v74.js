// V74 — Anchor normalization for existing relay textures (purely visual).
// Source crops are measured once from V71 base.webp transparency bounds.
// No Canvas readback, new Image, game state or hitbox changes per frame.
const CROP_V74=Object.freeze({
  1:[44,51,119,165,94,128],
  2:[47,51,116,155,105,143],
  3:[39,22,124,186,119,166],
});
export function relaySpriteRectV74(level,imageWidth=200,imageHeight=240){
  const [x,y,w,h,dw,dh]=CROP_V74[Math.max(1,Math.min(3,Math.round(Number(level)||1)))];
  const rw=Math.max(1,Number(imageWidth)||200)/200;
  const rh=Math.max(1,Number(imageHeight)||240)/240;
  return {sx:x*rw,sy:y*rh,sw:w*rw,sh:h*rh,dx:-dw/2,dy:-dh/2,dw,dh};
}
export function drawRelaySpriteV74(ctx,img,level){
  const r=relaySpriteRectV74(level,img?.naturalWidth||img?.width,img?.naturalHeight||img?.height);
  ctx.drawImage(img,r.sx,r.sy,r.sw,r.sh,r.dx,r.dy,r.dw,r.dh);
  return r;
}
