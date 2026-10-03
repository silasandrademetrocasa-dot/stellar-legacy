# AUDIT V13.3.1 — PILOT LIVE REFRESH

## Causa raiz
`openSpendConfirm()` oculta o modal de Hangar antes de executar a ação confirmada. `refreshPilotViews()` só chamava `renderHangar()` quando o Hangar estava visível. Portanto a compra/evolução alterava o estado corretamente, mas a aba Perfil de Piloto permanecia com o DOM antigo até ser reaberta.

## Correção
A condição de visibilidade foi removida de `refreshPilotViews()`. Se a aba ativa for `pilot`, `renderHangar()` é executado mesmo durante o modal de confirmação. Ao retornar ao Hangar, a interface já está sincronizada com `progress.pilotBio`.

## Fluxos afetados e corrigidos
- Compra de Núcleos Quânticos
- Evolução de habilidade
- Reset da árvore
- Conversão de Núcleos em PP

## Compatibilidade
Nenhum schema, save ou ID foi alterado.
