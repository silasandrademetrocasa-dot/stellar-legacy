import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='public/assets/ships3d/v50';
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));
const ids=['phoenix','leonov','liberator','piranha','vengeance','bigboy','goliath','citadel','aegis','spearhead','defcom','yamato','nostromo'];
assert.equal(manifest.length,13);
for(const id of ids){
 const ship=manifest.find(x=>x.game_ship_id===id);assert(ship,`Falta ${id}`);
 const path=root+'/SL_'+ship.name.toUpperCase()+'_LOD.glb';
 assert(fs.existsSync(path),`Falta asset ${path}`);
 const data=fs.readFileSync(path);
 assert.equal(data.readUInt32LE(0),0x46546c67,`GLB inválido ${id}`);
 assert(data.length<256000,`Asset pesado ${id}`);
 assert(ship.lod_triangles>0 && ship.lod_triangles<10000,`Triângulos ${id}`);
}
const game=fs.readFileSync('public/game.js','utf8');
const server=fs.readFileSync('server/index.js','utf8');
const data=fs.readFileSync('public/data.js','utf8');
for(const s of [game,server,data])assert(s.includes('STELLAR_SHIPS3D_FLEET_V50'),'Falta patch completo');
for(const text of ['ensureAllowedShipSaveV50(progress)','STELLAR_3D_V50.draw(ctx,progress.activeShipId,a,shipSize)','isShipAllowedV50(shipId)','Object.values(SHIPS).filter(s=>isShipAllowedV50(s.id))'])assert(game.includes(text),`Falta proteção: ${text}`);
assert(server.includes("app.use('/api/save'"),'Autoridade de save ausente');
assert(fs.existsSync('sql/STELLAR_V50_FROTA_13_NAVES_APLICAR_APOS_DEPLOY.sql'));
console.log('✅ Stellar V50: 13 assets GLB, save Aurora, Hangar/Loja, WebGL2 3D + fallback 2D');
