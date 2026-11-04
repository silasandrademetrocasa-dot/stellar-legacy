# V130.0 — Entrega cumulativa do Stellar Legacy (APK/Web)

O projeto completo do release foi reconstruído sobre a V126.0: contém os sistemas históricos, mapas, assets, Android, Render, SQL e testes. A V130 melhora principalmente a venda de recursos/itens e o custo do painel de missões no Autopilot.

**Instalação de um único deploy (recomendado):** envie somente `STELLAR_LEGACY_V130_0_PATCH_UNICO.zip` para a raiz do repositório existente e execute **Stellar Legacy — Instalador Universal**. Esse ZIP é incremental e NÃO substitui todos os 80 MB de recursos gráficos que já estão instalados.

**Projeto completo:** os arquivos `STELLAR_LEGACY_V130_0_COMPLETO_PARTE_XX.zip` são para reconstruir do zero ou arquivar. Extraia todos na MESMA pasta, na ordem, antes de publicar; eles NÃO devem ser processados isoladamente pelo Instalador Universal porque são partes de um único projeto.

**Banco:** nenhuma migração SQL adicional da V130. V123/V125 devem estar instaladas. Não apagar jogadores. Não colocar `STELLAR_SAVE_V119_MODE=enforce`.

**Validação:** `npm run check` e `npm test` na pasta final, reconstrução completa a partir dos ZIPs e hashes conferidos. O APK requer validação real do botão de venda e do FPS. Veja `docs/V130_0_CUMULATIVA_ESTABILIDADE_APK_VENDAS.md`.
