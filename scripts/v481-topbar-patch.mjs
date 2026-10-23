// STELLAR LEGACY • V48.1 — aplica apenas entradas de assets de navegação.
// npm run check executa este patch depois que o Instalador Universal copia o ZIP.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const htmlFile=path.join(root,'public','index.html');
const navJs=path.join(root,'public','modules','topbar-navigation-v481.js');
const navCss=path.join(root,'public','modules','topbar-navigation-v481.css');
for(const file of [htmlFile,navJs,navCss])if(!fs.existsSync(file))throw Error('V48.1: arquivo essencial ausente: '+path.relative(root,file));
let html=fs.readFileSync(htmlFile,'utf8');
if(!html.includes('id="topbar"')||!html.includes('id="frontierExpansionBtnV42"')||!html.includes('id="mobileCombatModeBtn"')||!html.includes('id="hudIntelligenceQuick"')){
 throw Error('V48.1: anchors de menu não encontrados. Patch interrompido para evitar incompatibilidade.');
}
const scriptTag='<script type="module" src="/modules/topbar-navigation-v481.js?v=48.1.0"></script>';
const styleTag='<link rel="stylesheet" href="/modules/topbar-navigation-v481.css?v=48.1.0">';
let changed=false;
if(!html.includes('/modules/topbar-navigation-v481.js')){
 if(!html.includes('</body>'))throw Error('V48.1: fechamento do body não encontrado');
 html=html.replace('</body>',`  ${scriptTag}\n</body>`);changed=true;
}
if(!html.includes('/modules/topbar-navigation-v481.css')){
 if(!html.includes('</head>'))throw Error('V48.1: fechamento do head não encontrado');
 html=html.replace('</head>',`  ${styleTag}\n</head>`);changed=true;
}
if(changed)fs.writeFileSync(htmlFile,html,'utf8');
console.log('✅ V48.1 barra superior: '+(changed?'arquivos conectados ao HTML':'já aplicada (idempotente)'));
