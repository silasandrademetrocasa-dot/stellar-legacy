# V22.12.0 — DESIGNERS GALÁCTICOS

**Base:** V22.11.1 integral. **Sem SQL**. **Sem alteração de atributos.**

## Entrega
- Base orbital da Terra (azul), Marte (vermelha) e Júpiter (dourada) no X-1/X-8 da facção dona do território.
- Designer da nave inicial de Terra, Marte e Júpiter (no hangar e no mapa), inclusive pilotos remotos da mesma nave inicial.
- Novo conjunto visual de 5 famílias de NPCs comuns e chefes com silhuetas distintas.
- Caixa de NPC, box bônus, minério e portais padrão/PvP redesenhados para o mapa.
- Sprites transparentes otimizados em `/public/assets/v2212/`.

## Deploy
1. Enviar **somente** `stellar-legacy-V22.12.0-UPGRADE-DESIGNERS.zip` para a raiz da branch main no GitHub (prefixo em minúsculas).
2. Rodar Actions > Instalar versão do Stellar Legacy > Run workflow.
3. Esperar Render finalizar e recarregar o navegador/PWA.
4. Testar no X-1: base, boxes, minério, portal; visitar 4-1; verificar 3 facções e NPCs comuns/chefes.

## Segurança
Nenhuma migração SQL. Tudo que altera recompensas, dano, captura de relés ou saves continua com a lógica existente.

## Observação
Estas artes são sprites 2.5D (renders projetados), não malhas 3D reais. As naves e bases devem ser validadas visualmente no dispositivo antes de expandir a troca para todo o catálogo.
