# STELLAR LEGACY — RELAY TARGETING & ADM HOTFIX

## Release

Correção pontual sobre a V34.6.0, preservando a jogabilidade, os saves e a economia.

### Relés clicáveis no mapa

- Clique/toque no sprite A, B ou C em mapas PvP para selecionar o relé. Se estiver longe, a nave se aproxima até a distância de ataque e começa a enviar ataques autorizados pelo servidor.
- Clicar novamente no relé selecionado cancela. Mire como faria em um NPC; o relé tem aro de alvo e indicação visual de ataque.
- O painel **Batalha** informa status, escudo e HP dos relés, mas não contém mais botões de ataque. Não altera o dano real, cooldowns, capture RPC, munição ou recompensas.
- Não permite atacar a estrutura do próprio clã; o servidor continua verificando autenticação, alcance, zona neutra e proteção.

### ADM

- Campos de HP, escudo, dano, cadência, tempo de conquista, proteção, multiplicador de fim de semana e sistema ativo agora têm formulários compactos para edição. O painel não é reconstruído enquanto o ADM digita em um campo.
- Novo bloco de testes: mapa, ponto e duas operações distintas: **Expulsar clã** (preserva facção) ou **Liberar clã + facção** (volta ao neutro).
- Reset é autorizado duas vezes, pelo JWT no servidor HTTP e pela função SQL com papel de serviço. Auditado e transacional.
- Módulos retornam ao inventário do clã anterior com níveis preservados; a estrutura recupera HP/escudo base e fica sem proteção temporária. Histórico das conquistas permanece.

### Interface

- Nenhum rótulo de versão fica exposto nos painéis de jogo, oficina ou Event Control Center.
- Custos de upgrade mostrados somente ao clicar em **EVOLUIR** no módulo escolhido, com confirmação antes do gasto; não aparecem constantemente no painel.

## Instalação

1. Instalar ZIP completo pelo workflow Instalador Universal no GitHub e aguardar Render **Live**; não atualizar o workflow `.github`.
2. Aplicar `sql/V34_6_1_RELAY_ADM_RELEASE.sql` no Supabase. É aditivo, não substitui a migração V34.6.0.
3. Se quiser **desativar apenas a função de expulsão ADM** sem apagar histórico ou tabelas, executar `sql/V34_6_1_RELAY_ADM_RELEASE_ROLLBACK.sql` e restaurar o código anterior. O rollback desativa as permissões da função, não desfaz expulsões intencionais.
4. Testar um toque no relé no mapa e uma edição de parâmetro no ADM. Para teste da expulsão, confirme nome, mapa e ponto antes de executar. Não ocorreu nenhum reset automático na migração.

### Segurança

Não houve modificação em `public.game_saves`, créditos, níveis de clã, pass, vendas, PvE, PvP, spawn, economia nem agenda de eventos. Sem SQL aplicado automaticamente pelo ZIP.
