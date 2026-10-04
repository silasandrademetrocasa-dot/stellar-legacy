# Stellar Legacy V13.7.0 — HUD DOCK SYSTEM

# Stellar Legacy V13.5.0 — Clean UI + AUX-9 + Combat Audio

Atualização de interface aplicada sobre a base V13.1.0 WARFRONT, preservando as mecânicas e o backend existentes.

## Principais mudanças
- Barra superior mais fina, sem a logo grande.
- NAVE, MISSÕES, AUX-9, PORTAIS e HABILIDADES organizados no topo.
- Habilidades rápidas da nave/AUX-9 integradas à barra superior.
- Textos visuais LASER CTRL, MÍSSIL ESPAÇO e MÍSSIL PRONTO removidos da barra de munição; os atalhos continuam funcionando.
- Navegação de menus em modo exclusivo: abrir um menu principal fecha o anterior.
- Portal Astral AURORA disponível; NEXUS e ECLIPSE continuam visíveis, porém bloqueados como EM BREVE.
- Compatível com os saves e o backend da V13.1.0.

## Instalação
1. Suba os arquivos desta pasta no Git/Render.
2. Execute `sql/V13_3_STELLAR_IDENTITY.sql` se estiver instalando esta versão em outro banco; no projeto principal o ajuste de identidade já foi aplicado.
3. Confirme `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no Render.
4. Faça o deploy/restart do serviço.

## Controles preservados
- `CTRL`: laser
- `ESPAÇO`: míssil
- `E`: habilidade da nave
- `K`: Nova Burst do AUX-9
- `W`: WARFRONT
## V13.7.0 — HUD DOCK SYSTEM

- Sequência do HUD: JOGADOR → NAVE → MISSÕES → AUX-9.
- Topbar pode ser escondida sem deixar vão; cards sobem automaticamente.
- Munições e mapa ficam dockados no rodapé, lado a lado.
- Munição recolhida mantém OVERDRIVE e KAMIKAZE visíveis.
- Estados de recolhimento são persistidos no navegador.

## V13.5.0

- Interface limpa de textos de teste, versões e instruções internas.
- AUX-9 com papéis exclusivos por módulo, sem misturar combate e coleta.
- Áudio procedural de combate e animações com controle de volume.
- Perfil de Piloto atualiza imediatamente após compras e upgrades.
