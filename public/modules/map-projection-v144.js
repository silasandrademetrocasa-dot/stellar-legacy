// One world-space projection shared by scenery and minimap. No gameplay coordinates are changed.
export function mapCrop(iw,ih,ww,wh){
 const aspect=ww/wh;let w=iw,h=ih;if(iw/ih>aspect)w=ih*aspect;else h=iw/aspect;
 return {x:(iw-w)/2,y:(ih-h)/2,w,h};
}
export function drawWorldBackdrop(ctx,img,{width,height,cameraX=0,cameraY=0,worldWidth=7200,worldHeight=5400,overview=false}){
 const iw=Number(img?.naturalWidth||img?.width)||0,ih=Number(img?.naturalHeight||img?.height)||0;if(!iw||!ih||width<=0||height<=0||worldWidth<=0||worldHeight<=0)return false;
 const c=mapCrop(iw,ih,worldWidth,worldHeight);
 if(overview){ctx.drawImage(img,c.x,c.y,c.w,c.h,0,0,width,height);return true;}
 const x0=Math.max(0,cameraX-width/2),y0=Math.max(0,cameraY-height/2),x1=Math.min(worldWidth,cameraX+width/2),y1=Math.min(worldHeight,cameraY+height/2);
 if(x1<=x0||y1<=y0)return false;
 ctx.drawImage(img,c.x+x0/worldWidth*c.w,c.y+y0/worldHeight*c.h,(x1-x0)/worldWidth*c.w,(y1-y0)/worldHeight*c.h,x0-cameraX+width/2,y0-cameraY+height/2,x1-x0,y1-y0);return true;
}
export function projectMapPoint(x,y,width,height,worldWidth,worldHeight){return {x:x/worldWidth*width,y:y/worldHeight*height};}
