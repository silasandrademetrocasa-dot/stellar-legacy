# Comparativo de performance V145.0

## Medição reproduzível

Comando: `node scripts/benchmark-local-first-v145.mjs`. Dados detalhados em `PERFORMANCE.json`.

Microbenchmark executado com Node v24.22.1, save sintético com inventário de 500 itens e 20 missões, 1.000 alterações pequenas de posição. O cenário mede serialização/transporte, sem Render, Android ou Supabase remoto.

| Métrica do cenário | Snapshot anterior | Transporte delta | Diferença |
|---|---:|---:|---:|
| Corpos JSON de 1.000 requisições | 8.216.500 bytes | 258.424 bytes | 96,85% menos |
| Mesmos corpos comprimidos com gzip para estimar compressibilidade | 2.499.762 bytes | 146.632 bytes | 94,13% menos |
| Consultas de configuração, 100 acessos espaçados em 45s | 100 | 15 | 85% menos |

Requests de upload normalmente não usam gzip; a linha comprimida é somente uma comparação de compressibilidade. O tempo médio de codificação medido foi aproximadamente 0,071 ms neste host, não no celular. Números reais estão no JSON e podem variar entre execuções.

## Comportamento alterado

- O timeout de sincronização aguarda mudanças, em vez de acordar continuamente para enviar um checkpoint inalterado.
- Um detector local de segurança ainda verifica módulos legados a cada sete segundos; timestamps de save/localização e marcadores `server*` não geram mudanças artificiais.
- A seleção do HUD não aguarda confirmação de HTTP; a aplicação definitiva dos efeitos da formação ainda segue confirmação do servidor.
- Evicção do cache de delta custa uma resposta 409 e um reenvio integral. Em múltiplas instâncias sem afinidade isso pode acontecer frequentemente e diminuir o ganho.
- Configurações podem estar temporariamente antigas; recarga explícita contorna a validade. Preços definitivos continuam protegidos pelo servidor.

## O que ainda não foi medido

Não existe neste pacote uma medição antes/depois de tráfego total por jogador em combate, quantidade real de SQL no Supabase, custo de CPU no Render, p95 de compra/coleta, consumo de bateria ou FPS Android. Não é possível inferir esses ganhos a partir do tamanho de um patch JSON.

As ações econômicas continuam utilizando os validadores existentes e esperas de rede. Portanto, não se declara que a latência de compra/BOX/recompensa foi eliminada. A próxima validação precisa capturar uma sessão com o mesmo mapa, duração, NPCs, BOX e aparelho nas duas versões.
