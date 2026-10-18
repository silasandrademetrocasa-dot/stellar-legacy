# STELLAR LEGACY — V22.11.1 · LOADING GALÁCTICO E PASSE JUSTO

## Instalação
1. Mantenha apenas um ZIP `stellar-legacy*.zip` na raiz da branch `main` do GitHub.
2. Envie o arquivo completo desta versão (não extraia o ZIP na raiz do repositório).
3. Rode **Actions → Instalar versão do Stellar Legacy → Run workflow**.
4. Aguarde Render concluir a publicação. Atualize o jogo instalado no Android, fechando e abrindo o aplicativo/PWA se necessário.
5. Confira a nova introdução, compras CR/STL e as missões do Passe.

## Novidades
- Arte de batalha espacial de **Terra, Marte e Júpiter** usada na tela de carregamento HTML, em WebP de aproximadamente 331 KB.
- Efeito leve de feixes de laser e barra de carregamento; saída ao término da inicialização e proteção contra travamentos prolongados.
- Avisos para jogadores sem referência a Supabase, PostgreSQL, SQL, RPC, RLS ou códigos internos de infraestrutura.
- **Sete missões diárias para todos**, sem AUX/Premium obrigatório: destruir NPCs; coletar boxes de NPCs; coletar boxes bônus; vender recursos; consumir munição; causar dano real a NPCs; coletar recursos de caixas.
- **Uma missão diária extra Premium** baseada em ataques acertados, igualmente executável sem AUX.
- Metas de missão progressivas pelo nível; missões já concluídas do dia preservadas no save.
- Contagem de vendas somente após confirmação da transação; contador de consumo de munição disparada; box bônus distinto de box NPC.
- Sistema de combate, AUX-9, HUD e protocolos da V22.11.0 preservados.

## Observações
- **Sem SQL novo.** Esta versão não zera passes, saves, caixas, progressão, relés ou territórios.
- A tela de inicialização nativa do Android/PWA (ícone e fundo simples) é controlada pelo sistema e pode aparecer rapidamente antes da introdução cinematográfica HTML. Para substituí-la completamente é necessário empacotar um aplicativo Android nativo.
- A segurança de recompensas de Passe, missões e XP ainda requer validação exclusivamente no servidor antes de compras em dinheiro real. Esta versão melhora objetivos e apresentação, mas não finaliza essa migração.
