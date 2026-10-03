# Stellar Legacy V13.2.1 — TOPBAR CLEAN

Atualização de interface aplicada sobre a base V13.1.0 WARFRONT, preservando as mecânicas e o backend existentes.

## Principais mudanças
- Barra superior mais fina, sem a logo grande.
- NAVE, MISSÕES, P.E.T., GG e HABILIDADES organizados no topo.
- Habilidades rápidas da nave/P.E.T. integradas à barra superior.
- Textos visuais LASER CTRL, MÍSSIL ESPAÇO e MÍSSIL PRONTO removidos da barra de munição; os atalhos continuam funcionando.
- Navegação de menus em modo exclusivo: abrir um menu principal fecha o anterior.
- Galaxy Gate ALFA disponível; BETA e GAMMA continuam visíveis, porém bloqueados como EM BREVE.
- Compatível com os saves e o backend da V13.1.0.

## Instalação
1. Suba os arquivos desta pasta no Git/Render.
2. Não há SQL novo para este patch de interface. Mantenha o backend V13.1 já instalado.
3. Confirme `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no Render.
4. Faça o deploy/restart do serviço.

## Controles preservados
- `CTRL`: laser
- `ESPAÇO`: míssil
- `E`: habilidade da nave
- `K`: Kamikaze do P.E.T.
- `W`: WARFRONT
