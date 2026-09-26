# Stellar Legacy V2

Jogo web mobile-first inspirado em space MMOs clássicos, com identidade própria e progressão local.

## Novidades da V2

- 4 mapas iniciais inspirados no fluxo **X-1 até X-4**.
- Hangar com seleção de naves clássicas de progressão inicial:
  - Phoenix
  - Liberator
  - Piranha
  - Leonov
  - Nostromo
  - Bigboy
  - Goliath
- NPCs baseados nas tabelas do DarkOrbitWiki:
  - Streuner / Recruit Streuner / Aider Streuner / Boss Streuner
  - Lordakia / Boss Lordakia
  - Saimon / Boss Saimon
  - Mordon / Boss Mordon
  - Devolarium
  - Sibelon / Boss Sibelon
- Seletor de munição laser:
  - LCB-10
  - MCB-25
  - MCB-50
  - UCB-100
- Seletor de mísseis:
  - R-310
  - PLT-2026
  - PLT-2021
  - PLT-3030
- Regra aplicada: **míssil com cooldown padrão de 5 segundos**.
- Extras/toggles de combate:
  - **Auto laser**: selecionar um alvo já ativa o laser automaticamente.
  - **Auto míssil**
  - **Turbo míssil** (reduz cooldown do míssil)
- Atalhos clássicos: **CTRL = ligar/desligar laser** e **ESPAÇO = lançar míssil** (R continua como atalho alternativo).
- Minimap, loot, coleta de minério, portais, alvo selecionado, barras de HP/ESC do alvo e save local.

## Rodar localmente

```bash
npm install
npm start
```

Abra:

```text
http://localhost:3000
```

## Render

- Build Command: `npm install`
- Start Command: `npm start`

## Supabase

A V2 continua compatível com a estrutura do projeto para Render/Supabase, mas o protótipo atual mantém o loop principal jogável no frontend e salva progresso em `localStorage`.

## Arquivos principais

- `public/index.html` → HUD e interface
- `public/style.css` → visual / HUD
- `public/game.js` → lógica do jogo V2
- `server/index.js` → servidor Express
- `supabase/database.sql` → estrutura inicial do banco

## Observações

Os dados de balanceamento usados como referência foram inspirados nas páginas públicas do DarkOrbitWiki enviadas pelo usuário. A implementação visual e a experiência desta versão são próprias.
