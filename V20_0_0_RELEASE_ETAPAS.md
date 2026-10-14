# STELLAR LEGACY — V20.0.0 | ATUALIZAÇÃO POR ETAPAS

## Etapa 1 — Integridade
- ADM → BOX BÔNUS permite configurar X-1 a X-8 e 4-1 a 4-3.
- SQL conserta função segura `admin_update_bonus_box_config_v1825` para não remover X-5..X-8.
- Cupom EVENTO7D legado (resgate puramente local) DESATIVADO. Novos cupons passam pelo RPC autenticado `redeem_game_coupon_v193`; recriar ofertas na área ADM → CUPONS.
- Benefícios PREMIUM locais existentes não são mais aceitos como autorização: o servidor deve possuir `premium_until`. Contas com benefício local não assinado precisam de regularização ADM individual.
- Textos de porão e expansora de slots corrigidos (sem modificar atributos atuais).

## Etapa 2 — Economia e Passe
- 6 receitas corrigidas: PLS-2 (20k CR + 20/20/20 básicos), CMT-2 (50k +20 Cryon/50 Virel), Ferrite (30k +75/50/25 básicos), Duracite (25k +60 Cryon/45 Virel/3 Ferrite), Solarium (50k +1 Voidite/3 Duracite/3 Ferrite), nanorreparo (150k +2 Duracite/10 Cryon/10 Ferron).
- Outubro mantém 500 pontos/tier. Novembro, se ainda não estiver criado: 30 tiers, 350 pontos/tier, 100 pontos por missão; aproximadamente 21 dias perfeitos para fechar.
- Prêmios finais de novembro: ARC-X no tier free, ARC-Ω no premium. Os outros tiers são copiados de outubro e ficam editáveis no ADM.

## Etapa 3 — Progressão tardia e AUX-9
- X-5=2, X-6=3, X-7=4, X-8=5 unidades por pedra normal (mesmos tipos, mesmas quantidades de pedras). Evento permanece com quantidades independentes.
- AUX-9 recebe XP por XP de NPC com teto 2.000 normal / 3.500 boss, não mais diretamente por créditos/STL da kill.
- Rendimento por pedra não é atualmente editável no ADM; está em `public/data.js`, precisa versão para alterar. Esta primeira implantação preserva a consistência do servidor.
- Warfront: NÃO foram adicionados créditos/STL por captura sem regra anti-exploit autoritativa, para não permitir geração fraudulenta de moeda. Requer etapa online específica.
- Drops raros: ARC-X e ARC-Ω via passe de Novembro; THR-7 e Nanobot Prime via ADM cupons. Nenhuma queda PvP aleatória injetada sem teste.

## Etapa 4 — Testes e Instalação
- Testes de regressão automatizados e de economia documentados, sem afirmar testes reais PvP multiplayer.
- Os scripts SQL são idempotentes para repetição controlada mas não substituem revisão de alterações feitas simultaneamente no ADM.
- Subir ZIP completo via workflow principal GitHub; publicar Render. SQL aplicado separadamente no Supabase, caso confirmado.
- Não sobrescrever a versão V20 com V19.x após o deploy.
