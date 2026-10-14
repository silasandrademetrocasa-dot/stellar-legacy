# STELLAR LEGACY V19.0.11 — EXPANSÃO ALTA X-5 A X-8

## Instalador
Envie **somente o ZIP completo** `stellar-legacy-V19.0.11-AEG-EXPANSAO-X8.zip` para a raiz do repositório, removendo o ZIP da instalação anterior. Use **o mesmo workflow principal** `stellar-installer-main.yml` — não substitua nenhum workflow. Depois, aguarde o deploy no Render e recarregue a página.

## Banco (realizado pelo ChatGPT)
Foram cadastrados e verificados no Supabase: 4 mapas novos (`x5` a `x8`), 12 setores próprios (1-5 a 1-8, 2-5 a 2-8, 3-5 a 3-8), 13 novas ligações e 8 NPCs com 16 regras de surgimento. NÃO é necessário executar o SQL para esse núcleo da expansão. O script da expansão está incluído em `sql/V19_0_11_EXPANSAO_X5_X8.sql` para referência e instalação futura em outros ambientes; ele é idempotente e inclui também as 12 associações de pools minerais.

**Limitação pendente:** a ferramenta de administração recusou o cadastro direto das 12 associações de minério (`game_map_resource_pool_v1814`), embora tenha aplicado e verificado todos os demais registros. Portanto, os pools minerais ainda não estão cadastrados nessa tabela do Supabase. O cliente e o servidor possuem **fallback de minérios incorporado ao código** para X-5…X-8, e a mineração nesses mapas funciona com os tipos locais. O ADM poderá cadastrar os pools depois; não houve alteração nos pools antigos.

## Mapa e progressão

| Região | Nível mínimo | NPCs novos | Objetivo |
| --- | ---: | --- | --- |
| X-5 | 18 | Batedor da Fenda e Prime, Colossar | Entrada nos setores altos |
| X-6 | 22 | Corsário do Vazio e Prime, Batedor | Aumento de dano e resistência |
| X-7 | 27 | Guardião Nexus e Prime, Corsário | Região de combate pesado |
| X-8 | 32 | Ceifador Astral e Prime, Guardião | Segunda base segura e recursos |

Rota obrigatória:
- Terra: 1-4 → 4-1 → 1-5 → 1-6 → 1-7 → 1-8
- Marte: 2-4 → 4-2 → 2-5 → 2-6 → 2-7 → 2-8
- Júpiter: 3-4 → 4-3 → 3-5 → 3-6 → 3-7 → 3-8

Não há invasão neste estágio: mapas de território inimigo e Battle 4-X de outra facção ficam bloqueados na UI e nas verificações de entrada multiplayer do servidor. A facção e o nível são revalidados no save da conta durante o ingresso nas salas.

## Nova base X-8
- Área segura, reparação de HP e escudo, comércio de recursos, serviços e acesso normal ao Hangar/lojas.
- Portais Astrais continuam exclusivos da base **X-1**.
- Reutiliza elementos gráficos existentes para manter compatibilidade e bom desempenho em Android.

## AEG corrigido
O modificador `shieldRegenBonus` agora participa da regeneração real: o valor 0,0625 equivale a +6,25% por pulso de escudo (antes era apenas calculado e mostrado). O mesmo cálculo respeita reparadores comuns/Elite, Premium e Designers, sem aumentar o reparo de HP.

## Segurança, compatibilidade e limitações
- Saves, contas, balanceamento atual, valores de loja, temporadas e cupons preservados.
- Ficheiros binários/sprites existentes e ambos workflows `.github/workflows/*.yml` mantidos idênticos.
- Não representa novos sprites independentes para 8 NPCs: esses usam imagens já incluídas no jogo.
- Foram executados 15 testes direcionados do mapa, bloqueio de facção, regeneração e base. Testes antigos com versão hardcoded `19.0.5` não representam regressões de funcionamento e precisam de atualização para uma validação completa do suite histórico.
- Após o deploy, é necessário validar a navegação, os portais, salvamento e comércio com uma conta real; testes locais não substituem o servidor publicado.
