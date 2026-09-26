# Stellar Legacy
Jogo web mobile-first inspirado em space MMOs clássicos. Código e identidade próprios.

## Rodar localmente
npm install
npm start
Abra http://localhost:3000

## Render
1. Suba este projeto para um repositório GitHub.
2. No Render, New > Web Service e conecte o repositório.
3. Build: `npm install` / Start: `npm start` (ou use render.yaml).

## Supabase
1. Crie um projeto.
2. Abra SQL Editor e execute `supabase/database.sql` inteiro.
3. Depois configure SUPABASE_URL e SUPABASE_ANON_KEY no Render.

## Controles
Toque no mapa para mover. Toque em NPC para selecionar. LASER liga/desliga fogo contínuo. Foguete causa dano instantâneo. Encoste no loot amarelo para coletar.

## Roadmap
V1 atual: mapa, movimento touch, NPCs, alvo, laser, foguete, HP/escudo, loot, XP, level, créditos, portal visual e schema Supabase.
Próximas: autenticação/sync, hangar, equipamentos/configurações, drones, missões, múltiplos mapas, facções, loja, refinamento, gates e bosses.
