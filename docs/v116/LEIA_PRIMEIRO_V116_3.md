# STELLAR LEGACY V116.3 — CUMULATIVA | UI / UX / HUD / PORTAIS

## Instalação
- ZIP **cumulativo**, sem pasta externa, compatível com o **Instalador Universal** na raiz do repositório.
- Base técnica do projeto `47.7.60`. Substitui os arquivos modificados até V116.3 e inclui os hotfixes anteriores V110.2, V111.0, V111.1, V112.0, V113.0, V113.1, V115.0 e V116.1. **Não reaplicar ZIPs menores depois**.
- **Não existe migração SQL nova** nesta atualização de layout. O ZIP inclui quatro scripts SQL **históricos somente como referência para os testes**: não são executados pelo instalador e **não devem ser reaplicados** no Supabase sem uma auditoria separada. As migrações históricas devem estar instaladas se sua versão atual já usa esses sistemas.
- Limpar cache/recarregar o PWA após deploy, especialmente em Android, para buscar o novo CSS e arte do portal.

## Entregas de interface
1. **Login** — "Salvar Login" e "Manter conectado" compactos, checkbox e legenda na mesma linha. Mantém salvamento seguro da sessão e fluxo de senha.
2. **Farm Offline** — removido V103 do cabeçalho e textos laranja longos; projeção continua identificada como não creditada. Proteções de confirmação e resgate SQL intocadas.
3. **Hangar NAVE / DRONES / AUX** — cabeçalhos, paddings, tabs horizontais e cards padronizados para tela de celular, com foco em legibilidade e sem recortes. Removidos lembretes repetidos sobre CONF global; configuração e inventário continuam intactos.
4. **Protocolos AUX** — removido rodapé sobre SQL e textos redundantes do catálogo. As pré-condições técnicas continuam em tooltips, nos custos, no inventário e no backend. Percentuais limitados a duas casas, eliminando 7.0000000001%.
5. **Loja Orbital** — os cinco protocolos usam imagens próprias da pasta `assets/v109/aux-protocols/`, nunca o sprite genérico do AUX. Mantém preço e confirmação pelo servidor.
6. **Universo/Forja** — IDs técnicos continuam no transporte/API, mas o jogador vê nomes legíveis: Guarda Astral, Propulsor Nexus, Lança Eclipse e Matriz Trina.
7. **Passe** — contador agora usa a quantidade real de missões exibidas (7 gratuitas e 1 extra Premium, conforme definição atual), e não "5" fixo.
8. **HUD AUX-9** — nova barra de XP com o mesmo padrão do HUD do jogador e progresso calculado pela tabela de níveis do AUX, nome e LV preservados, troca de módulo logo abaixo.
9. **Portais** — correção do enquadramento dos seis sprites estáticos V71, aparando margens transparentes e centralizando a arte; um único drawImage e nenhuma alteração em teleporte/hitbox/rota.
10. **Diagnóstico V75** — opção de isolamento A/B fica oculta no menu comum, mas a medição de desempenho continua acessível.

## Preservação das versões cumulativas
- Rebase no **último V116.1**, mantendo seu watchdog do Autopilot, compra/venda na base, gerenciamento de timeout, lote de NPCs, proteções de save e correções de PvP, relés e eventos.
- V111.1 Farm Offline seguro e SQL idempotente não sofreram alterações funcionais. O histórico permanece com o servidor.
- Nenhum NPC/economia/loot alterado para a tarefa visual; combate original preservado.

## Validação
- `npm run check` e `npm test`: 422/422 testes no workspace cumulativo.
- Instalador Universal: validar aplicando este ZIP em um checkout limpo da versão base e executar novamente os testes.
- Aceite visual real ainda necessário: login em Android retrato, AUX HUD expandido/recolhido, loja dos protocolos, 2 CONF, portal visível em X-1/X-2, passagem pelo portal, Farm offline ativo e tela do Passe.

## Rollback
- Restaurar snapshot Git imediatamente anterior, não fazer rollback de tabelas SQL por mudança de CSS.
