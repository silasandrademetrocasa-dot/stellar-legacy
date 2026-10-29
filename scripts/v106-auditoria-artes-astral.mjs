/* V106 — auditoria sem exclusao automatica.
 * Animações/artes legadas podem ser referenciadas dinamicamente no APK.
 * --apply remove somente dois recursos antigos explicitamente verificados
 * como desnecessarios para o mapa; nunca remove sprites do Materializador.
 */
import {readFileSync,existsSync,unlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const game=readFileSync(join(root,'public/game.js'),'utf8');
const html=readFileSync(join(root,'public/index.html'),'utf8');
const directories=['public/assets/v38/gates/beta.webp','public/assets/v38/gates/gamma.webp'];
const apply=process.argv.includes('--apply');
if(!game.includes('V106: sem imagem volumetrica/GLB derivada no mapa'))throw Error('Codigo de mapa V106 ainda nao foi aplicado. Nada sera removido.');
if(!html.includes('gateMaterializerSprite'))throw Error('Materializador nao encontrado. Limpeza bloqueada.');
if(game.includes('`/assets/v38/gates/${'))throw Error('Mapa ainda carrega imagens v38 dinamicamente. Limpeza bloqueada.');
for(const file of directories){
 const actual=join(root,file),webPath='/'+file.replace(/^public\//,'');
 if(game.includes(webPath)||html.includes(webPath))throw Error(`Recurso ainda referenciado: ${file}`);
 if(!existsSync(actual)){console.log(`Ja ausente: ${file}`);continue;}
 if(apply){unlinkSync(actual);console.log(`REMOVIDO: ${file}`);}else console.log(`ELEGIVEL (nao removido): ${file}`);
}
console.log(apply?'Limpeza concluida: Materializador preservado.':'Dry-run. Para remover os dois recursos listados, rode com --apply.');
