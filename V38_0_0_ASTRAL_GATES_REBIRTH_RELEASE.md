# Stellar Legacy V38.0.0 — Astral Gates: Rebirth

**Pacote único para o Instalador Universal.** Base integral: V37.0.0 Beyond the Frontier.
A migração SQL *não é necessária*: as configurações de ondas, NPCs e recompensas
continuam no sistema V19.0.6 e os saves dos portais continuam no `game_saves`.

## Sete frentes integradas

1. **38.1 — Visuais únicos:** novos sprites `alpha.webp`, `beta.webp`, `gamma.webp`
   em perspectiva superior, com estrutura e cores específicas; desenhados no centro
   da arena. Aura dinâmica somente em qualidade média/alta; qualidade baixa usa
   imagem estática e geometria simples.
2. **38.2 — Materializador PRO:** retratos próprios e temas para Aurora, Nexus e
   Eclipse; barra de progresso por peças; visualização dos rounds e ondas de boss.
   34/48/64 peças e custos de giros/vida existentes preservados.
3. **38.3 — Radar e arenas:** minimapa mostra TODOS os NPCs vivos em qualquer
   distância dentro dos Portais Astrais; fora deles, radar normal inalterado.
   Arenas ampliadas para Aurora 11.500 × 8.500, Nexus 13.200 × 9.600 e
   Eclipse 14.800 × 10.800 unidades. Ondas e NPCs personalizados pelo ADM
   existentes continuam funcionais.
4. **38.4 — Chefes Astrais:** bosses usam as três fases já existentes com
   identidade de alerta e contorno por protocolo. Aurora tem perseguição mais
   rápida, Nexus recupera 16% do escudo máximo na transição para a segunda
   fase (uma vez), e Eclipse intensifica dano/pulso na terceira fase.
   Não cria novos tipos de NPC nem altera a tabela de recompensas.
5. **38.5 — Retomada:** snapshots salvos do mapa/onda atual agora incluem a
   posição do piloto e HP/escudo/posição dos NPCs vivos (limite 240);
   respeitam o mundo e não ressuscitam inimigos já eliminados.
   Após morte e retorno da base, o piloto reaparece no centro para evitar
   spawn diretamente no meio de inimigos. O registro acompanha o save normal
   do jogo; não equivale a novos checkpoints autoritativos de servidor.
6. **38.6 — ADM:** editor de ondas/recompensas existente permanece no Supabase,
   com prévia de tamanho da arena, identidade do portal e número de ondas de boss.
   Nenhuma substituição de preços ou sobrescrita da configuração remota.
7. **38.7 — FPS / compatibilidade:** ritmo de voo igual aos mapas PvE tradicionais,
   sem mudar a velocidade numérica no HUD. Minimap permanece no cadence budget;
   HUD usa cache das linhas estáveis. Sprites novos são pequenos, CSS do
   materializador desliga rotações em gráfico baixo mobile e em preferência de
   movimento reduzido. Revisão de cache mantém a assinatura antiga para assets
   já conhecidos, impedindo re-download desnecessário do catálogo inteiro.

## Instalação

1. Confirme o backup e o funcionamento da V37.
2. Coloque **somente este ZIP** na raiz do repositório e acione o Instalador
   Universal (`.github/workflows/stellar-installer-main.yml` já deve existir).
3. Aguarde todos os checks e o Render ficar Live.
4. **Nenhum SQL para aplicar.** Arquivo opcional de consulta somente leitura:
   `sql/V38_0_0_ASTRAL_GATES_READ_ONLY_CHECK.sql`.
5. Teste com as mesmas configurações de nave nos mapas X-8 e Aurora/Nexus/Eclipse,
   compare FPS e tempo para atravessar distâncias semelhantes, inspecione
   minimapa com alvos distantes, conclua uma onda, recarregue e retome.

## Segurança e compatibilidade

- Não apaga saves, jogadores, clãs, inventários, moedas, versões anteriores,
  módulos nem o SQL existente. Não é executado deploy automaticamente.
- O combate dos portais continua seguindo o mecanismo de arena local existente:
  a V38 não implementa arbitragem completa do combate pelo servidor.
- Os testes automatizados garantem formatos e contratos, **não substituem teste
  jogável real** do navegador nem validação de recompensas com o servidor.
- Não houve mudança de banco; rollback requer reverter o deploy de código,
  não executar DDL no Supabase.
