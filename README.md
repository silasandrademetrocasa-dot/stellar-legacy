# Stellar Legacy V13.2.0 — EVENT DOMINATION

Atualização focada em organização do HUD, eventos exclusivos nos mapas 4-X e disputa territorial entre clãs.

## Instalação
1. Suba os arquivos desta pasta no Git/Render.
2. Se o backend V13.1 já está instalado, execute apenas `sql/V13_2_EVENT_DOMINATION.sql` no Supabase. Para uma instalação limpa, use `sql/CURRENT_BACKEND.sql`.
3. Mantenha no Render as variáveis `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`.
4. Faça o deploy/restart do serviço.

## HUD V13.2
O topo foi reorganizado em sete grupos: **Perfil de Jogador, Mapas, Leilão, Missões, Batalhas, Lojas e Configurações**. As habilidades foram movidas para o topo, o minimapa fica no canto inferior direito e a barra de armas/munições ocupa o rodapé esquerdo sem cobrir o centro do combate.

## Eventos 4-X
Os mapas **4-1, 4-2 e 4-3 não possuem NPCs comuns**. Eles ficam livres até receberem um evento ativo. O World Boss diário rotaciona pelos 4-X e o fluxo também aceita futuros eventos agendados. Eventos futuros podem usar `config.npc_groups` para injetar NPCs existentes apenas durante a janela ativa.

Exemplo de grupo de NPC de evento em `config`:
```json
{
  "npc_groups": [
    {"type":"bossSibelon","count":4,"hp_multiplier":3,"damage_multiplier":2,"domination_points":5}
  ]
}
```

## Dominação entre Clãs
Durante um evento 4-X, ações válidas geram influência para o clã. O placar é separado por mapa/evento e, ao final da janela, o clã com maior pontuação assume o setor. O domínio permanece registrado até uma futura disputa daquele mapa. O clã dominante recebe **+10% de recompensa no World Boss** quando o evento ocorre em seu território.

## Controles
- `E`: habilidade da nave
- `K`: Kamikaze do P.E.T.
- `W`: WARFRONT / Eventos / Dominação
