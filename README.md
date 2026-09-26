# Stellar Legacy V4

V4 do protótipo web/mobile inspirado em space MMOs clássicos.

## O que mudou na V4

### Login + conta online
- Criar conta com **Callsign + e-mail + senha**.
- Login persistente.
- Renovação de sessão.
- Botão **SAIR**.
- Save em nuvem usando Supabase (`game_saves`).
- Backup local separado por usuário caso a conexão caia.
- Indicador no HUD: `ONLINE`, `SALVANDO` ou `OFFLINE`.

### Facções
No primeiro acesso de uma conta sem personagem, o jogador escolhe:
- **Terra Alliance** → mapas `1-1` a `1-4`.
- **Mars Dominion** → mapas `2-1` a `2-4`.
- **Jupiter Federation** → mapas `3-1` a `3-4`.

A conta começa com Phoenix, equipamento básico, zero drones e toda a economia/progressão da V3.

### Base + Zona Segura
Cada facção possui sua própria base no mapa inicial X-1.
- Raio da base: 300 unidades.
- NPCs nascem fora da zona.
- NPCs não entram na zona.
- Enquanto o jogador está dentro da base, NPCs não causam dano nem perseguem o jogador.
- HP e escudo regeneram mais rápido dentro da base.
- Ao morrer, o jogador retorna para a base X-1 da própria facção.
- A Safe Zone aparece no mapa e no minimapa.

### Sistemas mantidos da V3
- Loja completa.
- Naves obtidas e troca pelo Hangar.
- Equipamentos retornam ao inventário quando a nave é trocada.
- Lasers, geradores de velocidade, escudos e extras.
- Flax / Iris e limite de 8 drones.
- Munições e mísseis consumíveis.
- Auto Laser CPU / Auto Rocket CPU / Rocket Turbo CPU / Repair Bot.
- CTRL = laser.
- Espaço = míssil.
- B = Loja.
- H = Hangar.
- Mapas X-1 a X-4.

## Supabase — obrigatório para a V4

Abra **SQL Editor** no projeto Supabase e execute novamente:

`supabase/database.sql`

O arquivo é idempotente e adiciona a tabela `game_saves` e a coluna `uridium` necessária no perfil.

### Auth
A tela de cadastro usa e-mail real + senha. Se **Confirm email** estiver ativado no Supabase, o jogador precisa confirmar o e-mail antes do primeiro login. Para testes privados, você pode desativar confirmação de e-mail no painel do Supabase Auth.

## Render
O Web Service precisa ter:

```text
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
```

Também é aceito o nome `SUPABASE_PUBLISHABLE_KEY`.

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```

## Arquivos principais
- `public/game.js` — gameplay, loja, hangar, facções e Safe Zone.
- `public/api.js` — login, sessão e save online.
- `server/index.js` — API de autenticação/save e servidor web.
- `supabase/database.sql` — banco e políticas RLS.
