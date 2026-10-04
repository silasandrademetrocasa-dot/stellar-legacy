# Stellar Legacy V13.7.0 — HUD DOCK SYSTEM — Audit

- Base: V13.6.0.
- HUD superior: JOGADOR / NAVE / MISSÕES / AUX-9 em um único dock flexível.
- Topbar: hide/show persistente, sem reservar altura quando escondida.
- Cards: JOGADOR, NAVE, MISSÕES e AUX-9 recolhíveis; estados persistidos.
- Rodapé: MUNIÇÕES à esquerda e MAPA à direita no mesmo baseline, sem overlap.
- MUNIÇÕES recolhida: OVERDRIVE + KAMIKAZE continuam visíveis.
- Layout dinâmico recalcula largura do mapa e offsets após resize/toggles.
- JS validado com node --check.
- Sem SQL novo.
