# STELLAR LEGACY V69 — Sistema de Animações 2D/2.5D

Versão base: **47.7.24** (V68 instalada — Mapas Modulares V2 + NPCs)
Versão final: **47.7.25**.

## Instalação

1. Confirme que o repositório está na versão `47.7.24` e que as duas partes da V68 já foram aplicadas.
2. Envie `STELLAR_V69_ANIMACOES_WEB.zip` **sozinho** à raiz do GitHub (não misture com outros ZIPs).
3. Rode `Actions > Stellar Legacy — Instalador Universal`.
4. Espere os testes passarem antes de verificar o deploy do Render.
5. Teste um portal comum, PvP e universo, as três bases em território próprio/inimigo e os relés de 4-X nos três perfis gráficos.

## Mudanças visuais

- **Portais**: 6 famílias x 8 quadros, anel externo fixo, núcleo animado a 5,3 FPS, 3 perfis.
- **Bases**: Terra, Marte, Júpiter; 12 quadros por base (840×490), âncora fixa, Baixo estático, Médio 6 quadros alternados, Alto 12 quadros.
- **Relés**: 3 níveis, imagem estrutural limpa e fixa, eventos de ataque vinculados ao evento real de disparo do servidor, impacto vinculado a redução real de HP/escudo. Não foi criada nova máquina de estados de gameplay.
- **Fallback**: sempre usa o renderizador antigo se as novas imagens ainda não carregaram ou falharam.
- **Cache**: sprites versionados em `/assets/animations/v69/`, carregamento no contexto visível, reaproveitamento do asset cache existente.

## Não alterado

Teletransporte, portais/destino, interações, zonas seguras, dano, HP, escudo, hitbox, coordenadas, relés e dinâmica de PvP, moedas, inventário, NPCs, sprites de naves/drones, banco Supabase.

## Pendências conhecidas

1. As 8 imagens de cada nível de relé são numeradas e **não têm uma descrição autoritativa por estado**. Alguns efeitos laterais vêm truncados no material de origem. O renderer usa somente a estrutura isolada de `estado_01` e efeitos procedurais ligados aos campos/eventos existentes. As outras imagens ficam no diretório `references/` para revisão artística futura. Não chamar essas referências de "estados implementados".
2. Efeitos de combate independentes (layers de canhão, escudo, impacto) para os relés não foram entregues limpos; seria necessário fornecer artes isoladas caso se deseje animar cada camada com alta fidelidade.
3. Os testes automatizados cobrem os dados, assets, renderizadores e estados; **o funcionamento e FPS em navegadores/celulares reais ainda precisam de validação manual** após o deploy.
