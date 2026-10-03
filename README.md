# Stellar Legacy V13.3.1 — PILOT LIVE REFRESH

Hotfix sobre a V13.3.0 Stellar Identity.

- Perfil de Piloto redesenha imediatamente após comprar Núcleos Quânticos.
- PP, saldo de Núcleos, botões e custos atualizam na hora após converter PP.
- Níveis de habilidade e desbloqueios seguintes atualizam imediatamente após evolução.
- Reset da árvore também atualiza sem fechar/reabrir o Hangar.
- Saves, IDs internos e compatibilidade da V13.3.0 preservados.


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
