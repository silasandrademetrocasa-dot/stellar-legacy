# STELLAR LEGACY V32.1.5 — candidato de integração

Base: V30.5.0 mais o desenvolvimento incremental da V32.

## Integrado e coberto por testes automatizados
- IA local de patrulha e retorno para NPCs comuns; não interfere em entidades controladas pelo servidor, bosses e eventos.
- Seleção tática de NPCs próximos pelo botão de alvo e tecla T; prioridades de ameaças recentes; exclui alvos mortos e jogadores.
- Atualização otimizada de NPCs comuns distantes; bosses e NPCs em combate continuam na cadência normal.
- Mantidos o HUD mobile compacto, as 43 artes de naves, AUX-9, as configurações e os presets de combate.
- Mantidos, sem alteração, os sistemas existentes de limpeza de eventos, multiplayer, sessão, economia e segurança do servidor.
- 40 testes automatizados e verificações de sintaxe, bundle e release.

## Não validado / não implementado integralmente
- Novo motor de bosses multifase, revisão completa de ondas/mapas/portais em servidor, redesenho de sprites, personalização por arrasto do HUD, reconexão multiplayer aprimorada e auditoria de todos os endpoints.
- Performance em aparelho real, ensaios multiplayer simultâneos e teste completo em staging.
- **Este ZIP não deve ser considerado uma V32 final de produção até essas etapas.**

## Operações
- Nenhum deploy no Render ou push no GitHub realizado. Conta Render requer confirmação do workspace antes de qualquer ação.
- Nenhuma migração SQL necessária para as alterações feitas; nenhum SQL executado.
- Instalação: ZIP completo compatível com instalador universal, sem .github/ ou script protegido do instalador.

- **V32.1.5**: Mobile Experience Pro 2.0: landscape-first, 3 colunas no HUD inferior, hangar horizontal responsivo e convite não bloqueante a girar a tela.
