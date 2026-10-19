# STELLAR LEGACY V33.0.0 — NEXT GENERATION INTEGRATION

> **Pacote único de teste integrado.** Alterações implementadas sobre a V32.1.8, sem alteração de banco, inventário ou assets originais; lançamento na nuvem apenas após teste prático.

## 1. NPC Intelligence — manutenção e regressão
- Corrigida a dupla atualização de ângulo de NPC distante durante tick simplificado.
- Patrulha de NPCs comuns, perseguição, fases de bosses e exceções das entidades controladas pelo servidor foram preservadas.
- Testes de exceções e priorização realizados.

## 2. Tactical Combat
- Seleção automática e manual passam a usar a mesma regra de priorização de NPCs (ameaça recente, distância, desempate estável).
- A opção de auto-combate continua condicionada ao acesso Premium/Passe existente. Sem mudanças em dano ou cadência de disparo.

## 3. Performance Engine
- Atualização do minimapa agora considera modo gráfico e combate no celular; HUD mobile com transparência sólida em vez de blur de fundo caro.
- FPS real ainda depende do aparelho, mapa, quantidade de NPCs e rede: medir com o diagnóstico do jogo.

## 4. Mobile Experience Pro
- Mantidos os ajustes da V32.1.8 para chat, minimapa, armas, hangar, nomes e controles horizontais.
- Formulário do chat ganha proteção adicional contra ser cortado pelo dock do HUD.

## 5. Events & Universe
- Eventos locais concluídos ou fora de elegibilidade agora descartam NPCs, minérios e comboios temporários pendentes, evitando acúmulo de entidades.
- Eventos sincronizados do servidor continuam sob autoridade do servidor, com regras de agenda existentes.

## 6. Multiplayer & Security
- **Proteção de portais agora usa a mesma área (raio 240) no servidor e no cliente.** Zonas neutras de NPC não existem nos portais de mapas PvP nem nos portais que levam a PvP.
- WebSocket limita tamanho de mensagens recebidas e taxa de mensagens por cliente (com margem para partidas normais).
- Status de HP e escudo recebidos pela rede têm limites finitos; a ação administrativa de atualizar eventos exige perfil de administrador e callsign já autorizado.
- Auditoria completa de PvP e economia exigirá testes adicionais em staging.

## 7. Visual Evolution
- Menos desfoque caro por trás dos painéis mobile; cores e legibilidade preservadas, com todas as artes originais intactas. Nenhum sprite novo foi incluído.

## 8. Final Integration
- Testes automatizados de contratos, integridade de assets, servidor, modais, segurança dos portais, IA, chat e nomenclaturas.
- ZIP único, raiz pronta para o instalador universal; não substituir o workflow protegido `.github` do GitHub.

## O que **não** é declarado concluído
- 30/60 FPS estáveis em aparelhos específicos; validação de multiplayer com dezenas de jogadores; invasão e antifraude em ambiente real; nova árvore de IA ou artes redesenhadas.
- Sem deploy no Render, sem SQL executado, sem migrações novas. A primeira instalação deve ser de teste e o progresso das contas deve ser conferido antes e depois.

## Teste após instalar
1. Conexão/login, fechar e reabrir; conferir XP, STL, CR, itens, configurações e presets.
2. 4-1/4-2/4-3: portais não podem impedir dano; nos mapas normais a proteção deve corresponder ao círculo indicado no jogo.
3. NPCs comuns patrulham sem acumular e seleção pelo botão/T prioriza NPC agressor.
4. Evento iniciado/concluído: NPCs extras somem ao encerrar, sem duplicação de recompensa.
5. No celular deitado: chat e campo de envio visíveis, minimapa expande/recolhe; FPS durante combate, evento, hangar e base.
6. Multiplayer: duas contas em aparelhos diferentes, movimentos, dano PvP, troca de mapa, reconexão.
