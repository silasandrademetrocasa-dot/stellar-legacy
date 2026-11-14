/** DOM-free placement in CSS pixels, above the local ship and clear of the weapon HUD. */
export function baseActionsPositionV1461({ship,width,height,panelWidth,panelHeight,topInset=8,weaponTop=height}){
 const w=Math.min(panelWidth,Math.max(0,width-24)),h=panelHeight;
 const left=Math.max(12,Math.min(width-w-12,ship.x-w/2));
 const ceiling=Math.max(8,topInset),floor=Math.min(height-12,weaponTop-12,ship.y-72);
 return {left,top:Math.max(ceiling,Math.min(floor-h,ship.y-72-h)),width:w};
}
