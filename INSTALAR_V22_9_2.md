# Stellar Legacy V22.9.2 — correção de mineração online e HUD de eventos

## Instalação
1. Faça upload na **raiz** da branch `main` somente do ZIP `stellar-legacy-V22.9.2-MINERACAO-EVENTOS.zip` (começa com `stellar-legacy` **minúsculo** e termina com `.zip`). Confirme que é um ZIP real de cerca de 13,4 MB, não um atalho/arquivo parcial.
2. GitHub > **Actions** > **Instalar versão do Stellar Legacy** > **Run workflow**.
3. Aguarde a confirmação de deploy do Render; a versão técnica do servidor deverá ser **22.9.2**.
4. Atualize o navegador do celular para obter `/game.js?v=22.9.2` e os módulos correspondentes.

## Testes obrigatórios no jogo
1. Em **1-4**, aproxime a nave de um minério. A coleta normal deverá gerar o comprovante do Supabase e adicionar minério ao porão, sem o erro `sem confirmação do servidor`. Teste também o AUX-9 no módulo de mineração com o AUX ao alcance real da pedra.
2. Recarregue a página e confirme que a carga recebida continua no porão. Minério já coletado não pode render uma segunda entrega após F5.
3. Em uma janela de evento **Ruptura Warfront** (restrita a 4-1/4-2/4-3), entre em **1-4**: o HUD deve informar evento ativo **em outro setor**, sem criar NPCs especiais nem progresso falso em 1-4. Entrando em 4-1, o evento deverá ser jogável.
4. Em eventos de mapas normais, verifique o HUD e objetivos no 1-4. A primeira sincronização pode mostrar `SINCRONIZANDO EVENTO NESTE SETOR` enquanto a sala confirma o estado.
5. Verifique trocas de janela sem saltar de mapa, relés PvP, AUX Sentinela defensivo, NPC kills, saves e sem perda de CR/STL.

## Banco e segurança
- **Não há SQL novo**. O ledger `stellar_ore_reward_ledger` e a função `stellar_grant_ore_reward_v229` já estavam aplicados. A correção liga essa função do servidor principal ao motor WebSocket que esqueceu de recebê-la na V22.9.0/22.9.1.
- Em falha real de concessão, a pedra é restaurada no mundo e a nave **não** se concede minério localmente. A RPC permanece restrita ao servidor.
- Eventos que só podem ocorrer em PvP serão **informativos** nos mapas PvE; não geram recompensas nem abates nesses mapas.

## Validação técnica
- 309 testes locais aprovados, 101 arquivos JS e 216 caminhos de assets verificados.
- Publicação GitHub/Render e comportamento em produção precisam de confirmação após o deploy. Não habilitar pagamentos reais com base apenas nesta correção.
