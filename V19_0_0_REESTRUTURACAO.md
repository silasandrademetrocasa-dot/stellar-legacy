# STELLAR LEGACY V19.0.0 — Projeto de Reestruturação

## Fase 1 — Interface
- Remove aba LOJA ATUAL da vitrine; não apaga serviços antigos nem habilita compras reais.
- Mostra somente o catálogo de teste quando a RPC segura está disponível; se indisponível, exibe aviso seguro.
- Compacta os status Premium e Passe; cupom fica em painel expandível.
- Regras Arena (10 duelos/dia, loadout fixo) e Leilão (100M NOVA e garantia) foram movidas para rodapés expandíveis.
- Reduz textos redundantes no passe e na vitrine.

## Fase 2 — Assets
- `public/assets/v19/ammo/*.webp`: 9 sprites isolados e padronizados; SIP-2 com cor ciano própria.
- `public/assets/v19/equipment/terminal-mercante-remoto.webp`: arte para o EXTRA Elite já existente.
- Manifest de assets aponta para as novas artes. Assets anteriores permanecem como fallback histórico.

## Fase 3 — ATAQUE nave/drones, sem AUX
- 9 pesquisas e seus IDs mantidos para compatibilidade com os saves; valores e efeitos redesenhados.
- **Potência Laser I** (id detonation1): +3% / +6%.
- **Ruptura de Escudos** (id explosives): +2/4/6/8/10% de dano dos lasers se alvo possuir escudo.
- **Mira de Mísseis** (id heatSeeking): +1/2/4/6/10% de chance de acerto contra NPC.
- **Potência Laser II** (id bounty1): +3/+6% de dano de lasers da nave e drones.
- **Mísseis Potentes** (id rocketFusion): +2/4/6/8/15% de dano de mísseis.
- **Caçador de Aliens** (id alienHunter): +2/4/6/8/12% de dano de laser PvE.
- **Precisão Crítica** (id detonation2): +2/4/6 pp na chance crítica contra NPCs.
- **Eletro-Óptica** (id electroOptics): +5/10/15/20/25 pp na chance de acerto de lasers contra NPCs.
- **Combate entre Pilotos** (id bounty2): +2/4/8% de dano de laser PvP.
- Ataque do AUX Nova Burst continua existindo, mas não é aumentado por pesquisas do piloto.
- Limite 50 PP e progresso dos 9 IDs preservados. Habilidades já investidas recebem seus novos efeitos.
- Alteração de balanceamento sem migração SQL. Teste PvP depois do deploy.

## Fase 4 — Organização Git
- `docs/historico-v18/`: documentação/LEIA_PRIMEIRO obsoletos reorganizados, sem perda de informações.
- SQL históricos, workflows, README, saves e assets anteriores mantidos.
- ZIP é um release completo para instalar via nosso instalador, sem manipulação destrutiva de `git history`.

## Testes
Execute `node tests/v19-overhaul.test.mjs` e os scripts em `tests/`, `test_smart_missions.mjs`, `scripts/test-events-period-v1826.mjs`.

Não realizar nenhuma migração SQL para esta release.
