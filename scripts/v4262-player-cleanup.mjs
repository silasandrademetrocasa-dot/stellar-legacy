#!/usr/bin/env node
// Maintenance-only patch. UI copy stays separate from economic rules and database operations.
// Applied after the Universal Installer copies the ZIP, during npm run check.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const FROM='42.6.1',TO='42.6.2';
const patch=(path,transform)=>{
 const full=resolve(ROOT,path);
 if(!existsSync(full))throw Error('Arquivo necessário ausente: '+path);
 const before=readFileSync(full,'utf8'),after=transform(before);
 if(typeof after!=='string'||!after.length)throw Error('Alteração inválida em '+path);
 if(before!==after)writeFileSync(full,after,'utf8');
};
export function replaceCopy(source,oldText,newText){
 // Literal replacement only: never rename CSS selectors, API function names, save keys, or SQL identifiers.
 return source.split(oldText).join(newText);
}
export function tidyUI(source){
 const copy=new Map([
  ['Carregando módulos do servidor...','Carregando equipamentos...'],
  ['Banimento, reset de progresso e exclusão definitiva protegidos pelo backend.','Gerencie contas, restrições e recuperação de progresso.'],
  ['Central ADM Data Driven • Eventos, Passe e Lojas controlados pelo runtime.','Gerencie eventos, passe e lojas em um só lugar.'],
  ['ATUALIZAR RUNTIME','ATUALIZAR CONFIGURAÇÕES'],
  ['Aguardando status dos runtimes...','Aguardando informações dos sistemas...'],
  ['Etapa 2/5 • monitoramento.','Acompanhamento das atividades.'],
  ['Altere os valores sem editar código ou SQL. Os valores abaixo são bônus adicionais.','Personalize os prêmios dos portais. Os valores abaixo são bônus adicionais.'],
  ['O jogo será recarregado para sincronizar seu inventário.','Reinicie o jogo para conferir seus novos itens.'],
  ['Operação confirmada no Supabase. O jogo será recarregado para sincronizar moedas, recursos e a revisão do save.','Operação concluída! O jogo será reiniciado para atualizar seus recursos.'],
  ['Sincronizando com o servidor…','Atualizando suas informações…'],
  ['Expansões indisponíveis: ${e?.message||e}. Confira a migração SQL.','As atividades do universo estão temporariamente indisponíveis. Tente novamente.'],
  ['FABRICAÇÃO ASTRAL — protótipos colecionáveis que não alteram o dano ou escudo até validação do motor.','FABRICAÇÃO ASTRAL — módulos especiais que não alteram o dano ou escudo nesta temporada.'],
  ['Esse ranking é um primeiro passo. Domínio territorial PvP e combates em grupo exigem integração adicional com o servidor de mundo.','O domínio territorial e novos combates em grupo chegarão em futuras temporadas.'],
  ['Os projetos são objetivos cooperativos. Buffs globais e bônus de PvP não estão ativados nesta integração inicial.','Participe dos projetos coletivos e ajude sua facção a alcançar novas metas.'],
  ['ADMIN — custos configuráveis sem editar código. Campos estruturais não podem ser alterados.','ADMIN — ajuste os custos e as recompensas das atividades.'],
  ['V42.1 — OBJETIVOS DE ESQUADRÃO','OBJETIVOS DE ESQUADRÃO'],
  ['Carregando sistemas da V42.3…','Preparando suas configurações…'],
  ['V42.2 • CONFIGURAÇÕES ASTRAIS','CONFIGURAÇÕES ASTRAIS'],
  ['V42.3 • ADM OPERAÇÕES','ADMINISTRAÇÃO DE OPERAÇÕES'],
  ['V42.3 • OPERAÇÕES COOPERATIVAS','OPERAÇÕES COOPERATIVAS'],
  ['Equipamentos fabricados são persistidos em duas configurações. Bônus de dano/escudo ainda NÃO estão ativos até validação do motor de combate.','Equipe os módulos fabricados nas duas configurações. Seus efeitos de combate ainda não estão disponíveis.'],
  ['Quantidade fabricada limita o número de posições ocupadas. Trocas não alteram escudos atuais, atributos PvP ou histórico do piloto.','Cada módulo ocupa uma posição de equipamento. As trocas preservam o estado atual da nave.'],
  ['Progresso confirmado pelo ledger de NPCs do servidor. Esta etapa é preparação para raids; chefes cooperativos em tempo real ainda não estão ativados.','Os abates do esquadrão contam para a missão. Novos desafios cooperativos chegarão em breve.'],
  ['V42.4 • EXPLORAÇÃO DE ANOMALIAS','EXPLORAÇÃO DE ANOMALIAS'],
  ['V42.5 • MERCADO INTERGALÁCTICO','MERCADO INTERGALÁCTICO'],
  ['V42.5 • INFRAESTRUTURA DOS CLÃS','INFRAESTRUTURA DOS CLÃS'],
  ['V42.6 • CENTRAL ADM DE EXPANSÕES','CENTRAL DE EXPANSÕES'],
  ['Carregando V42.6…','Preparando novas atividades…'],
  ['Setores de pesquisa instanciados. Abates contabilizados pelo servidor; ainda não são mapas pilotáveis no mundo 2D.','Explore investigações especiais e conclua objetivos para ganhar recompensas; estas áreas ainda não são mapas pilotáveis.'],
  ['Somente módulos Astrais fabricados. A venda coloca o item em custódia e a compra transfere créditos e inventário numa transação.','Negocie módulos Astrais com outros pilotos. Os itens anunciados ficam reservados até a venda ou o cancelamento.'],
  ['Projetos financiados com pontos de pesquisa. Melhorias de combate não são aplicadas automaticamente.','Invista suas pesquisas para desenvolver novas instalações do clã.'],
  ['Alterações validam limites no servidor. Recompensas de investigações em andamento permanecem travadas aos valores originais.','Gerencie os objetivos das investigações. Atividades iniciadas mantêm suas condições originais.'],
  ['V42.1 —', ''],
  ["'39 • FORJA'","'FORJA'"],
  ["'40 • GUERRA'","'GUERRA'"],
  ["'41 • EXPLORAÇÃO'","'EXPLORAÇÃO'"],
  ["'42 • CIVILIZAÇÃO'","'CIVILIZAÇÃO'"],

  ['PROGRESSO CONFIRMADO NO SERVIDOR','PROGRESSO DA SUA JORNADA'],
  ['Conquistas e NPCs são registrados online e continuam salvos após sair ou atualizar a página.','Suas conquistas acompanham seu piloto em todas as partidas.'],
  ['Sem dados do servidor. Execute a migração de Elite no Supabase.','As recompensas de elite estão temporariamente indisponíveis.'],
  ['Objetivos novos são criados inativos. As métricas são confirmadas no servidor.','Novos objetivos começam desativados até serem liberados.'],
  ['Seis recompensas confirmadas pelo servidor e objetivos históricos já conhecidos pelo piloto.','Conclua desafios especiais e conquiste recompensas de elite.'],
  ['Não concedem Créditos/STL até terem validação própria no servidor.','São marcos da sua jornada e não concedem Créditos/STL.'],
  ['Sincronizando... Aguardando SQL V36.','Sincronizando informações...'],
  ['SALVAR REGRAS SQL','SALVAR REGRAS'],
  ['Apenas ações registradas no servidor.','Somente ações concluídas contam.'],
  ['O servidor calcula a reparação em ciclos de 60s; HP destruído não regenera sozinho.','A recuperação acontece gradualmente; HP destruído não regenera sozinho.'],
  ['Seu clã ainda não possui guerras declaradas nesta versão.','Seu clã ainda não possui guerras declaradas.'],
  ['V37 • BEYOND THE FRONTIER','BEYOND THE FRONTIER'],
  ['Sincronizando os contratos do SQL V37...','Sincronizando os contratos...'],
  ['Progresso semanal conferido pelo servidor. Abates e coleta só contam com recibo SQL de combate/mineração. Setores de referência: X-6, X-7 e X-8.','Suas caçadas e coletas ajudam a concluir contratos semanais. Setores: X-6, X-7 e X-8.'],
  ['SALVAR SQL','SALVAR CONTRATO'],
  ['(apenas ações da semana corrente contam no SQL)','(apenas ações desta semana contam)'],

 ]);
 let result=source;
 for(const [oldText,newText] of copy)result=replaceCopy(result,oldText,newText);
 return result;
}

// These edits are intentionally narrow; the game loop and backend economy remain untouched.
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
patch('server/index.js',s=>{
 s=s.replace("const RELEASE_VERSION = '42.6.1'","const RELEASE_VERSION = '42.6.2'");
 if(!s.includes("const RELEASE_VERSION = '42.6.2'"))throw Error('Versão HTTP divergente');
 return s;
});
patch('public/index.html',s=>tidyUI(s.replaceAll(`?v=${FROM}`,`?v=${TO}`)));
patch('public/game.js',s=>s.replaceAll(`?v=${FROM}`,`?v=${TO}`));
patch('public/modules/astral-rewards-v381.js',s=>{
 s=tidyUI(s.replaceAll(`?v=${FROM}`,`?v=${TO}`));
 // Keep detailed errors in developer console, never in in-game modals.
 s=s.replace("if(box)box.textContent='Astral Rewards indisponível: '+message;","if(box)box.textContent='Recompensas temporariamente indisponíveis. Tente novamente.';");
 s=s.replace("editor.textContent='Não foi possível carregar as recompensas: '+message;","editor.textContent='Não foi possível carregar as recompensas. Tente novamente.';");
 s=s.replace("alert(e.message||String(e));","alert('Não foi possível concluir esta ação. Tente novamente.');");
 s=s.replace("alert('Recompensas '+names[key]+' atualizadas no Supabase.');","alert('Recompensas de '+names[key]+' salvas com sucesso.');");
 s=s.replace("alert('Recompensas '+names[key]+' salvas com sucesso.');","alert('Recompensas de '+names[key]+' salvas com sucesso.');");
 s=s.replace("(rev. ${fmt(a.revision)})",""); // internal config revisions must not appear in UI
 return s;
});
patch('public/modules/unified-expansion-v42.js',s=>{
 s=tidyUI(s.replaceAll(`?v=${FROM}`,`?v=${TO}`));
 s=s.replace("alert(String(e?.message||e));","alert('Não foi possível concluir esta ação. Confira os requisitos e tente novamente.');");
 s=s.replace("root.textContent=`Expansões indisponíveis: ${e?.message||e}. Confira a migração SQL.`;","root.textContent='As atividades estão temporariamente indisponíveis. Tente novamente.';");
 s=s.replace("card.textContent='Objetivo semanal indisponível: '+String(err?.message||err);","card.textContent='Objetivo semanal temporariamente indisponível.';");
 s=s.replace("card.textContent='Admin de objetivos indisponível: '+String(err?.message||err);","card.textContent='Não foi possível carregar os objetivos.';");
 return s;
});
patch('public/modules/stage-a-v423.js',s=>{
 s=tidyUI(s.replaceAll(`?v=${FROM}`,`?v=${TO}`));
 s=s.replace("function alertError(e){alert(String(e?.message||e));}","function alertError(e){console.warn('[equipamentos]',e);alert('Não foi possível concluir esta ação. Tente novamente.');}");
 s=s.replace("card.textContent='Módulo V42.3 indisponível: '+String(e?.message||e);","card.textContent='Este painel está temporariamente indisponível. Tente novamente.';");
 return s;
});
patch('public/modules/stage-b-v426.js',s=>{
 s=tidyUI(s.replaceAll(`?v=${FROM}`,`?v=${TO}`));
 s=s.replace("alert(String(e?.message||e||'Falha'))","alert('Não foi possível concluir esta ação. Tente novamente.')");
 s=s.replace("p.textContent='V42.6 indisponível: '+String(e?.message||e)","p.textContent='Este painel está temporariamente indisponível. Tente novamente.'");
 return s;
});
for(const file of [
 'public/modules/v21/command-center-view.js',
 'public/modules/galactic-dominion-v360.js',
 'public/modules/frontier-v370.js'
])patch(file,tidyUI);
patch('public/modules/performance-monitor.js',s=>s.replace("    `Versão: ${String(version).slice(0,30)}`,\n",''));
// Keep one current maintenance guide instead of accumulating instructions in the project root.
patch('README.md',s=>`# Stellar Legacy

Jogo web multiplayer em evolução contínua. A documentação técnica e as migrações permanecem em \`sql/\`, \`tests/\` e \`scripts/\`.

## Instalação de atualizações

1. Faça backup antes de alterações econômicas ou de banco.
2. Mantenha apenas um ZIP de atualização na raiz do repositório.
3. Execute o workflow **Instalador Universal** no GitHub Actions.
4. A instalação só publica mudanças após validação de sintaxe, consistência e testes.

## Estrutura

- \`public/\`: interface, assets e cliente do jogo.
- \`server/\`: APIs, regras e integração do mundo.
- \`sql/\`: histórico das migrações para banco de dados.
- \`tests/\`: testes de regressão.
- \`scripts/\`: verificações e instalador.

**Versões internas de cache e API não devem aparecer na interface dos jogadores.**
`);
// Test fixtures must continue checking the new internal release, not the public-facing text.
patch('tests/stage-b-v426.test.mjs',s=>s.replace("assert.equal(pkg.version,'42.6.1');","assert.equal(pkg.version,'42.6.2');"));
console.log('Stellar Legacy: limpeza da interface e revisão de textos concluídas.');
}
