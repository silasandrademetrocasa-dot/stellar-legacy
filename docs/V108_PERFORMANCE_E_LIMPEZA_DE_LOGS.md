STELLAR LEGACY: CUMULATIVA DE RECUPERACAO V106.9 + V107 + V108 (FASE INICIAL)

BASE VALIDADA: V106.8E (login funcionando Web + APK). Aplicar este ZIP uma UNICA VEZ sobre V106.8E.
NAO INSTALAR V106.9 antiga separadamente. Seu codigo servidor foi incorporado de forma seletiva.

V106.9: restaurado calculo de conclusao e ACK das missoes V106.8; guard server anti-rollback
restaurado; abates NPC com entrega serial por jogador, retry RPC idempotente e recuperacao de recibo.
V107 (fundacao): Universo Estelar V42 novamente disponivel, mas script pesado carregado SOB DEMANDA
somente no clique, sem tocar no fluxo do login. Protecao de boot pre-auth V106.8E integralmente mantida.
V108 (fundacao de performance): logs periodicos do trafego WS ficam DESLIGADOS por padrao,
mas telemetria permanece em memoria para admin e pode ser reativada na env do Render
STELLAR_NETWORK_LOGS=1. Mensagens TESTE de login e isolamento removidas.

SQL: Reativacao de 24 funcoes Universo em sql/STELLAR_V107_REATIVAR_UNIVERSO_POS_DEPLOY.sql.
A SQL de desativacao aplicada anteriormente AINDA ESTA VIGENTE no servidor; execute o SQL de
reativacao SOMENTE DEPOIS da versao nova estar LIVE e um teste de login ter passado.
Os SQLs antigos de mapas e CPU ja foram aplicados e nao precisam repetir.

NAO ALTERA SALDOS, RECOMPENSAS JA PAGAS, INVENTARIO, EQUIPAMENTO, XP, FARM OFFLINE OU
BANCOS COM O ZIP. NAO FAZ DEPLOY AUTOMATICO.  SERA NECESSARIO NOVO APK PARA NOVO HTML/JS.

CHECKLIST CRITICO:
1) Confirmar save, pausar Autopilot e encerrar farm em curso antes do deploy.
2) Instalar ZIP pelo instalador universal, rodar npm run verify.
3) Confirmar commit no GitHub e Render LIVE, abrir Web. LOGIN e combate devem funcionar.
4) Verificar as duas CONFs, armas, drones, extras, saves.
5) Aplicar SQL de reativacao do Universo depois do passo 3.
6) Abrir Universo e ver painel apenas quando clicar, validar leitura e transacoes seguras.
7) Testar missao curta (1 ou 2 abates para concluir), observar mensagem UNICA de recompensa,
   saldo, reconexao e progresso persistente. Se der conflito suspender farm ate entender.
8) Recompilar APK, confirmar login e comportamento WebView; se falhar, NAO apagar dados.

OBSERVACAO: Esta entrega inaugura a V107 (startup e save safety) e a V108 (log e
telemetria leve). A remodelacao completa de saves e a otimizacao profunda de FPS estao
FORA deste hotfix, exigem fases seguintes com medicao no jogo real.
