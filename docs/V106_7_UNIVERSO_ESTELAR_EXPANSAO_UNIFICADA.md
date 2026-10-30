# V106.7 — Universo Estelar (Expansão Unificada V42)

## Tela afetada
`EXPANSÃO UNIFICADA → UNIVERSO ESTELAR`, abre Forja, Guerra, Exploração, Civilização e ADM. **Não é o acesso aos mapas U-1/U-2/U-3.**

## Diagnóstico
O front-end `public/modules/unified-expansion-v42.js` descartava toda exceção de `GET /api/frontier/v42` e escondia o problema atrás da frase “As atividades do universo estão temporariamente indisponíveis”.

A rota existe e chama `public.stellar_u42_dashboard()`. A RPC existe, todas as tabelas dependentes consultadas estão presentes; foram observadas 28 execuções no histórico `pg_stat_statements` com média ~70,9 ms, máximo ~165,7 ms. Assim, não há prova de que o sistema esteja permanentemente ausente. A falha mostrada pelo piloto por volta de 20h04 ocorreu próxima a timeouts de outras consultas no Supabase. **Não foi possível recuperar o HTTP exato da tentativa do piloto; a causa individual ainda depende dos novos logs.**

## Mudanças
1. Apenas a leitura GET do dashboard ganha **uma** tentativa adicional após erro de rede, timeout, 502/503/504; operações de Forja/Expedição/Doação/Esquadrão não recebem retry automático.
2. Erros de sessão e SQL inexistente não são repetidos, e são descritos adequadamente.
3. A UI oferece **TENTAR NOVAMENTE** e não destrói o último painel carregado se ocorrer falha transitória.
4. O Render diferencia códigos de erro `UNIVERSE_DB_TIMEOUT`, `UNIVERSE_SQL_MISSING`, `UNIVERSE_DB_ERROR`, `UNIVERSE_INVALID_RESPONSE`, com log seguro `[universe-v42] dashboard read failed` sem IDs de usuário, tokens ou saldos.
5. O servidor continua usando Supabase autenticado e as mesmas funções econômicas/RLS. Sem alterações de nível, progressão, recursos, recompensas ou SQL.

## Regressão recomendada
- Abrir a Expansão Unificada com Supabase respondendo: quatro abas devem aparecer.
- Simular 503/timeout somente na primeira leitura: o cliente recupera automaticamente.
- Simular duas falhas consecutivas: deve apresentar motivo e botão para nova tentativa.
- Simular 401/403: deve orientar sessão, sem contornar as proteções de login.
- Abrir, fazer compra/expedição e voltar para a tela sem duplicação de operação econômica.
- Capturar `[universe-v42]` no Render se o problema persistir e relacionar ao status HTTP da requisição.

## Limites
Esta é uma **correção de resiliência e diagnóstico**, não uma promessa de que um banco com indisponibilidade prolongada passará a funcionar. O motivo exato da tentativa vista no print não pôde ser identificado sem o retorno HTTP da mesma solicitação.
