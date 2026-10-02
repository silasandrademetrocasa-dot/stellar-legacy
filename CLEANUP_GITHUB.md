# Limpeza do GitHub — baseline V11

A ideia é deixar a `main` com apenas a versão atual do jogo. O histórico antigo já existe nos commits do GitHub, então não é necessário manter dezenas de arquivos de versão dentro da árvore atual.

## Pode apagar da versão atual

Todos os arquivos antigos no formato:

```text
CHANGELOG_V9*.md
CHANGELOG_V10*.md
```

Também podem sair da árvore atual, porque já foram aplicados no banco e ficam recuperáveis no histórico do Git:

```text
sql/V10_9_ARENA_PVP.sql
sql/V10_10_DAILY_ARENA_REWARDS.sql
supabase/database.sql
```

A V11 substitui isso por:

```text
CHANGELOG.md
sql/V11_ARENA_CINEMATIC.sql
supabase/README.md
```

## NÃO apagar

Mesmo tendo `v8` no nome, **não apague**:

```text
public/assets/v8/
```

Essa pasta ainda é usada pelo `manifest.js` e contém sprites ativos de naves, equipamentos, munições, drones, NPCs, backgrounds e recursos.

Também mantenha:

```text
.github/workflows/main.yml
.chatgpt-deployed-version
.env.example
.gitignore
public/
server/
render.yaml
package.json
```

## Resultado esperado

A raiz do projeto fica pequena e legível: README, changelog consolidado, guia de limpeza, código atual, SQL atual e configuração de deploy.
