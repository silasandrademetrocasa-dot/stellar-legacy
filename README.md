# Stellar Legacy V5.2

V5 foca no loop econômico do jogo: exploração → coleta → combate → caixas de carga → porão → retorno à base → venda → compra de equipamentos.

## O que entrou na V5

### Porão / Cargo
- Cada nave usa sua capacidade de carga real definida em `public/data.js`.
- A Phoenix começa com porão de 100 unidades.
- Minérios coletados não viram mais créditos automaticamente: agora ocupam espaço no porão.
- O porão é salvo junto com o restante do personagem no save online/local.
- O botão **PORÃO** abre a carga atual e mostra valor de venda.

### Trader da base
- Recursos só podem ser vendidos dentro da Zona Segura do mapa X-1 da própria facção.
- Preços-base implementados:
  - Prometium: 10 CR
  - Endurium: 15 CR
  - Terbium: 25 CR
  - Prometid: 200 CR
  - Duranium: 200 CR
  - Promerium: 500 CR
- Xenomit é guardado, mas não é vendido nesta versão.
- Botões para vender recurso individual ou **VENDER TUDO**.

### Mineração
- 18 pedras/minérios aparecem em posições aleatórias no mapa.
- Tipos seguem o mapa atual (X-1 a X-4).
- Ao coletar uma pedra, outra nasce depois em outra posição aleatória.
- Se o porão estiver cheio, a coleta é bloqueada.

### Cargo boxes dos NPCs
- Créditos/Uridium/XP do abate são concedidos no momento da destruição.
- O NPC deixa uma caixa física no mapa com os recursos/minérios correspondentes.
- Os valores de recursos dos NPCs iniciais foram configurados com base nas tabelas do DarkOrbitWiki.
- Se não houver espaço suficiente, a caixa mantém o restante dos recursos no mapa.

### Respawn de NPC
- NPC destruído entra numa fila de respawn.
- Depois de 6–13 segundos, reaparece em outra posição aleatória do mapa.
- No X-1, respawns continuam respeitando a Zona Segura.

### Minimap V5
- NPCs não aparecem mais globalmente.
- Só são exibidos NPCs dentro do alcance de radar próximo da nave.
- Minérios também ficam limitados a uma área menor de radar.
- Um círculo mostra o alcance aproximado do radar.
- Clique/toque no minimapa para definir um destino e a nave navegar automaticamente até o ponto.
- O destino atual também fica marcado no minimapa.

## Compatibilidade

A V5 é compatível com contas/saves da V4.2. O campo `cargo` é criado automaticamente em saves antigos.

Não é necessário executar um novo SQL exclusivamente para a V5; o porão é armazenado dentro do JSON de `game_saves` já usado pelo jogo.

## Atalhos

- `CTRL` — ligar/desligar laser
- `ESPAÇO` — disparar míssil
- `1–4` — selecionar munição laser
- `B` — Loja
- `H` — Hangar
- `C` — Porão
- Clique/toque no minimapa — navegar para o ponto

## Deploy

Render:

```text
Build Command: npm install
Start Command: npm start
```

Variáveis:

```text
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```
