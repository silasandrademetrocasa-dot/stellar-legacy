# STELLAR LEGACY V20.2.9 — CONFIGURAÇÕES MOBILE E MEDIÇÃO POR CENA

## Origem: diagnóstico real V20.2.8
- 14,3 FPS geral; cerca de 16 FPS durante a partida, com queda adicional ao abrir CONF.
- Tempo JS p95 17,3 ms; jogabilidade JS p95 13,3 ms; HUD JS p95 7,1 ms; Canvas p95 8,9 ms.
- Espera entre quadros p95 143,8 ms. Esses p95 não somam e não provam causalidade.

## Mudanças (sem alteração em combate, saves, SQL, economia ou backend online)
1. Suspensão do **desenho do Canvas atrás de CONF**, mantendo update(dt), rede e simulação com a mesma frequência de antes. A cena volta a ser desenhada no frame seguinte ao fechamento.
2. `renderSettings()` não percorre DOM quando as configurações estão ocultas. A abertura mostra o modal e **depois** renderiza seus controles.
3. Ranking deixa de gerar HTML para todos os cards quando a aba ranking não está aberta. Consulta do ranking ao abrir CONF/JOGO deixa de ser disparada sem necessidade. Aba conta continua com atualização do resumo.
4. Diagnóstico do FPS separa **jogando** de **configurações**; transições entre as duas cenas não entram nos percentis. Painel oculto não recebe dezenas de escritas DOM a cada 1,2 s; contador compacto continua atualizando.
5. Novo relatório com FPS de cada cena e amostras. Só contém métricas locais, sem dados de conta.

## Limites e cuidado
- FPS de CONF não deve ser comparado diretamente com FPS jogando, pois o desenho fica suspenso atrás do modal; a simulação continua.
- O sistema só congela o **desenho**, não o movimento/combat timer; ao fechar, mostra o estado atual. Não deve interromper ataques automaticamente.
- Faça teste em mapa seguro e confira dano e escudos ao abrir CONF durante uma batalha: a regra continua idêntica às versões anteriores.
- Nenhum benchmark Android executado durante a criação.

## Teste sugerido
1. Jogar 2 minutos com diagnóstico ativo e qualidade BAIXA no mesmo mapa.
2. Abrir CONF/JOGO, alternar abas JOGO/RANKING/CONTA, ficar ~45 segundos em CONF.
3. Fechar CONF e conferir sprites e movimentos imediatamente.
4. Copiar relatório, informando `FPS jogando`, `FPS em configurações`, tempo JS/Canvas e long frames.
5. Confirmar conta, rankings, preferência de áudio, qualidade, HUD e salva/progresso após reconectar.
