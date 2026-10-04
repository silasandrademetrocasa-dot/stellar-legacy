# AUDIT V16.6.0 — HUD / PREMIUM / EVENTS

## Escopo entregue
- HUD inferior reorganizado: chat no canto esquerdo inferior, munições centralizadas e minimapa no canto direito inferior.
- Campo de digitação do chat ancorado no rodapé do painel.
- Conta administrativa FELP / ADM recebe kit local com:
  - todas as naves liberadas;
  - itens/equipamentos liberados no inventário;
  - 8 drones Iris no hangar;
  - AUX-9 liberado com gears ativos;
  - todos os designers liberados localmente e equipáveis sem RPC.
- Loja Premium refeita com 4 planos locais:
  - 1 semana;
  - 1 mês;
  - 3 meses;
  - 6 meses.
- Sistema inicial de cupons implementado na Central Premium.
- Cupom inicial configurado: `EVENTO7D`.
- Recompensa do cupom inicial:
  - +7 dias de Premium;
  - +1 Nanobot de Reparo • Comum (`rep2`).
- Shared Universe ajustado para rotação de eventos:
  - segunda a sexta: rotação a cada 4h;
  - sábado e domingo: rotação a cada 1h.

## Arquivos principais alterados
- `public/game.js`
- `public/style.css`
- `public/index.html`
- `server/world.js`
- `package.json`
- `README.md`
- `CHANGELOG.md`

## Observações
- Os novos planos Premium e o sistema inicial de cupons funcionam localmente no save da conta.
- O desbloqueio do FELP / ADM também é persistido no save da conta.
- A rotação semanal dos eventos foi implementada no scheduler do servidor websocket compartilhado.
