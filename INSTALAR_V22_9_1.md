# Stellar Legacy V22.9.1 — Correção PvP, eventos e AUX Sentinela

## Instalação
1. Na raiz do repositório GitHub, deixe apenas um pacote que comece com `stellar-legacy` e termine com `.zip`.
2. Faça upload de `stellar-legacy-V22.9.1-PVP-EVENTOS-SENTINELA.zip` na branch `main`.
3. Em Actions > Instalar versão do Stellar Legacy > Run workflow, execute o instalador.
4. Confirme a versão 22.9.1 no log do Render e recarregue o jogo no celular para atualizar os módulos JS.

## Validação no jogo (essencial)
- Entre diretamente em 4-1, 4-2 e 4-3. Mundo e NPCs devem carregar independentemente de latência da leitura dos relés; a captura deve ficar inativa até a confirmação do Supabase.
- Aguarde a posse A/B/C atualizar sozinha; simule uma conexão lenta/desconexão para confirmar que o jogo não registra conquistas sem leitura do banco.
- Com evento agendado/ativo no ADM, mantenha-se no mapa e verifique o HUD atualizar sem salto. Teste também em mapa PvP elegível ao tipo de evento.
- No AUX-9 Sentinela, aproxime-se de um NPC neutro, selecione-o e ataque-o sem receber dano: o AUX NÃO deve perseguir nem atacar.
- Receba dano de NPC válido: o AUX deve revidar apenas contra esse NPC, durante cerca de 12 segundos após o último dano efetivo. Esquiva, zona protegida e ataques contra jogadores não ativam revida.
- Mate ou se afaste do agressor: o AUX deve voltar à patrulha/companhia. Teste módulos Salvager, Minerador, Reclaimer e Nova Burst (não devem mudar).
- Recarregue o jogo e verifique saves, CR/STL, estado dos relés e recompensas de NPC.

## Banco e segurança
Nenhuma migração SQL nova nesta versão. Não limpar/recriar `stellar_warfront_nodes`, saves ou eventos. Durante a sincronização inicial de relés o servidor não permite capturas antes de receber dados válidos. Após erro de leitura o sincronizador tenta novamente periodicamente. Estado persistido não é substituído por posse neutra local.

## Limitação
Os testes automatizados passaram localmente. O funcionamento em multiplayer/Render só pode ser confirmado depois do deploy e dos testes de entrada, captura e eventos com os jogadores. Não habilitar compras com dinheiro real por conta desta atualização.
