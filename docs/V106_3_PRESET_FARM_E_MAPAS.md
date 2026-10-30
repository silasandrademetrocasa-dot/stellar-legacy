# Stellar Legacy — V106.3 | Presets Farm e persistência de mapa

## Diagnóstico
- O preset local de FARM pode armazenar uma composição mais curta que a CONF ativa. `exchangeCombatBuildV2013` troca os equipamentos da nave por itens do blueprint, devolvendo os não escolhidos ao inventário, sem mostrar reduções.
- `save_player_location_v1774` na instância de produção aceita x1..x4, b41..b43 e ggAlpha/Beta/Gamma, mas rejeita os IDs reais x5..x8 e u1..u3. Os erros foram observados após resgate offline em x7.

## Cliente
- O botão de salvar passou a `SOBRESCREVER` para presets existentes, com confirmação e checagem de estado durante o diálogo.
- `APLICAR` executa dry-run sem mutação e avisa quantitativo de lasers/geradores/extras/drones/AUX removidos, e de substituições, incluindo itens indisponíveis.
- A confirmação é cancelada se o hangar mudar enquanto o modal está aberto.
- A lógica econômica, armazenamento do preset (localStorage), persistência CONF1/2, antifraude V106.2 e regras de inventory continuam inalteradas.

## Banco (SQL separado)
- Patch idempotente na whitelist da função `save_player_location_v1774`, sem relaxar autorização de usuário, limites de coordenadas, timestamp nem demais verificações. Abortará se a versão da função não for a esperada.
- **Não aplicar enquanto o farm está em andamento.**

## Verificações
- `node --check public/game.js`
- `npm run verify` — 240/240 testes passaram, incluindo 6 cenários novos V106.3.
- SQL verificado contra o texto exato do filtro da função de produção, mas **ainda não executado**.
- Testes de APK real, posição X-7 após reconexão, e persistência da montagem após resgate seguem pendentes.
