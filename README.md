# Stellar Legacy V4.2

V4.2 corrige o login/cloud save removendo o Render do caminho de rede entre o jogo e o Supabase.

## Mudança principal

- O Render continua hospedando o jogo e fornece somente `/api/config`.
- O navegador usa a Project URL + Publishable Key para acessar Supabase Auth e REST diretamente.
- A Publishable Key pode ficar no cliente; a segurança dos saves depende das políticas RLS do `database.sql`.
- Login, cadastro, refresh de sessão, perfil e `game_saves` passam a funcionar sem depender do outbound fetch do Render.

## Antes do deploy

Execute `supabase/database.sql` no SQL Editor do Supabase.

No Render mantenha:

- `SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`

Nunca coloque a Secret Key no frontend.

## Deploy

```bash
npm install
npm start
```
