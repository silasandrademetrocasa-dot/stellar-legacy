# Stellar Legacy V122.0 — Cumulativa Local-First (V121.0 a V122.0)

## Escopo de uma única atualização
- Inclui a V121.0 (LAB) e V121.1 (integração base com IndexedDB e Hangar).
- V121.2: **backstop** de sincronização em primeiro plano, a cada 5 segundos **quando houver operações críticas pendentes (hangar, missões, munição)**; os saves de movimento continuam seguindo o limitador V117.2. Não envia estado completo em intervalo fixo. Respeita autenticação, visibilidade, offline, Farm ativo e desligamento `?localfirst=0`.
- V121.3: retentativas com backoff exponencial até 60 segundos, sem novas instâncias de escritor HTTP; preserva o coordenador single-flight V106.
- V121.4: espelho legível pelo legado em `localStorage` coalescido a cada 2 segundos; primeira gravação imediata; flush quando app vai ao fundo. IndexedDB continua save local principal.
- V121.5: intenções de Hangar mais antigas tornam-se `superseded` no diário IndexedDB, sem serem falsamente reconhecidas como recebidas pelo servidor. Movimentos de Hangar deixam de disparar o PUT redundante quando o agendador já vai enviá-lo.
- V122.0: bump de cache para 47.7.61, testes unitários e regressão de release, manifesto de patch cumulativo.

## Limite importante
A V122 **NÃO** migra economia/compra, crédito/STL, missões premiadas, PvP, Warfront ou leilão para operações locais autoritativas: estas continuam no backend transacional existente. A V122 **NÃO** ativa `enforce` e NÃO requer SQL. Implantação sem duplicar o mecanismo escritor do servidor.

## Instalação
Subir **somente este ZIP** pelo Instalador Universal em cima da versão base 47.7.60. O pacote inclui a V121.1 completa e as alterações V122; não instalar V121.0/V121.1 separadamente se ainda não instalou.

## Verificação
`npm run check` e `npm test`. Teste do navegador real recomendado: entrar, fazer uma troca CONF1/CONF2, aguardar `HANGAR SALVO`, fechar/abrir, conferir moedas e equipamento. Testar `?localfirst=0` como fallback. Se falhar, reverter com o commit anterior; nada é zerado no Supabase.

## Pendências de arquitetura
Para eliminar por completo os RPCs legados de compra/venda e reduzir latência do comércio: desenvolver uma API transacional de comandos econômicos com recibos duráveis/idempotentes, dedução de saldo e concessão de item numa única transação no Supabase. Um cache IndexedDB sozinho não comprova posse ou saldo no multiplayer.
