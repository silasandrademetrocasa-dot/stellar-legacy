# Validação V138.0 — 11/11/2026

- `npm test`: **669 testes aprovados, zero falhas**.
- Verificação de release e grafo de módulos: versões consistentes, nenhum caminho estático ausente e nenhuma dependência de cliente ausente.
- Servidor local real: `/health` retornou `ok: true`, versão `47.7.70`; HTML com o mesmo identificador; **100 respostas HTTP válidas de imagens WebP** (50 apresentação + 50 mapa).
- PostgreSQL embarcado: migração aplicada duas vezes; coleta mantém ganho simultâneo de NPC; pedido repetido recupera recibo sem novo crédito; movimento durante a leitura usa posição de chegada; AUX fora do alcance é recusado; troca de sessão e banimento antes do commit impedem o consumo do drop; Farm offline continua impedindo a coleta; funções novas são exclusivas do serviço.
- WebSocket real: identidade vem da autenticação; usuário enviado no corpo é ignorado; não coleta sem mapa; três cópias simultâneas do mesmo pedido executam somente uma chamada ao coletor.
- Catálogo SQL: migração repetida não altera inventário nem bônus existentes; os 32 designs específicos são habilitados; os universais continuam desabilitados.
- Artes: 50 originais individuais, 50 exportações de 2048×2048 e 50 derivados de 512×512. Identidades e hashes distintos; margem e transparência verificadas. Originais gerados: **1254×1254**. A exportação 2048 não é 2K nativo.
- Revisão visual: pranchas de todas as artes e comparação com as silhuetas do ZIP e com a referência de drones enviada.

## Supabase

Aplicadas e verificadas no projeto conectado:

1. `stellar_v138_collection_context` — `STELLAR_V138_COLETA.sql`.
2. `stellar_v138_per_hull_design_art` — `STELLAR_V138_DESIGNS.sql`.

Resultado da verificação: 32 skins V138 ativas; zero skins universais antigas ativas; guarda de sessão presente no commit; `anon` e `authenticated` sem execução nas funções de contexto; `service_role` com execução; duas funções novas `SECURITY INVOKER`. A verificação de segurança não reportou as funções novas; avisos preexistentes do projeto não fazem parte desta correção.

Nenhuma conta de jogador foi usada para crédito, débito, compra ou coleta durante essa aplicação de SQL. O frontend/servidor ainda depende da instalação dos ZIPs e do deploy no Render.

## Verificação depois do deploy

No Android: coletar boxes e loots com AUX durante ataque; alternar configurações e comprar munição durante coleta; interromper e restaurar rede; confirmar saldo/porão após reconectar. Conferir Fury, Aegis e Titan no hangar e mapa; conferir os países da Leviathan e cada design de atributo na sua própria nave.

Não houve sessão autenticada em produção nem medição de latência real pós-deploy. A tentativa de teste automatizado de interface em Chromium foi bloqueada pelo ambiente na criação do socket de processo; os testes HTTP, WebSocket, SQL e a inspeção dos arquivos foram concluídos. O teste manual no aparelho continua necessário para confirmar desempenho real e apresentação da interface.
