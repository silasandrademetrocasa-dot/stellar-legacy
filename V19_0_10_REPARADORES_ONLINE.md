# Stellar Legacy V19.0.10 — Reparação online de HP e Escudo

## O que mudou
O jogo **não usa mais números fixos** para pulsos de reparação quando um robô está equipado.
A cada pulso de 1 segundo, consulta em `ITEMS` os atributos sincronizados pelo runtime de balanceamento V19.0.9:

- `repairTick` — HP regenerado por segundo com o robô equipado;
- `shieldRepairTick` — escudo regenerado por segundo com o robô equipado;
- `repairDelay` — segundos sem receber dano antes de regenerar (0 permitido).

A edição está em **ADM → BALANCEAMENTO → EXTRAS**, nos robôs `rep2` e `repElite`.
`repairRate` é a **prioridade para selecionar o melhor robô equipado**, não um segundo multiplicador da regeneração.

## Regras preservadas
- Sem robô, fora da base: **escudo +10.000/s** após 5 s; não regenera HP automaticamente.
- Na base, sem robô: **HP +5.000/s, escudo +10.000/s**, sem esperar.
- Robô Comum padrão: **HP +5.000/s, escudo +10.000/s**, após 5 s.
- Robô Elite padrão: **HP +10.000/s, escudo +15.000/s**, após 5 s.
- PREMIUM x2 e multiplicadores dos designers continuam aplicados a cada pulso.
- Os valores podem ser modificados online pelo ADM e sincronizam sem novo deploy; **0** desliga apenas o pulso respectivo.
- A atualização não altera preços, porão, escudos dos geradores, equipamento já adquirido, progresso, saves ou os valores publicados atualmente.

## Instalação
1. Envie o ZIP **completo** para a raiz da `main`, removendo o ZIP antigo.
2. Execute **o instalador principal de sempre** (sem trocar nem adicionar workflow).
3. Aguarde deploy do Render e recarregue o navegador.
4. Abra `ADM → BALANCEAMENTO → EXTRAS`, escolha Comum ou Elite, altere `HP REPARADO / SEGUNDO`, `ESCUDO / SEGUNDO` ou `ESPERA PARA REPARO` e publique.
5. Teste uma nave com HP/escudo abaixo do máximo após alguns segundos sem dano.

**SQL novo não necessário**: os três campos e a função de edição já existem no Supabase desde a V19.0.9.

## Testes
`node --test tests/repair-online-v1910.test.mjs`
`node --check public/game.js`
