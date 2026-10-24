# STELLAR LEGACY V53.0 — ASTRAL EXPANSION

Base: V52.6 Clean, com código e serviços preservados. ZIP acumulado instalável pelo Universal Installer. Sem migração SQL.

## Conteúdo
- 3 portais de viagem (Normal, PvP, Universo), modelos 3D mobile e PNG 2D de vista frontal.
- 3 portais astrais (Aurora, Nexus, Eclipse), HQ, mobile e 2D; Materializador apresenta montagem progressiva conforme peças já obtidas.
- 3 bases por facção com torres/docas e sprites top-down.
- 2 drones originais (Halo comum e Nova Elite) e 5 designers A–E visuais por atributo já existente.
- Pivô visual levemente deslocado para a frente (somente naves), sem mudar colisão/posição física.
- Materializador mantém contagem, custos, bônus, inventário e recompensas existentes.
- Menu global 2D / 3D / Automático herdado da V52.4.

## Segurança e performance
- GLBs mobile em public/assets/v53/models/; HQ permanecem nos arquivos de pré-aprovação já entregues e não entram no ZIP de deploy por causa do limite de 25 MB do GitHub.
- Cache de renderização GLB e fallback 2D; a escolha de 3D continua dependente do dispositivo.
- Sem alterações de SQL ou salvamentos; designers disponíveis conforme inventário e catálogo ativos no servidor.
- Portal em construção é visual no Materializador, não surge fisicamente no mapa até as regras existentes permitirem.

## Deploy
- Enviar um único ZIP instalador na raiz do GitHub e executar o workflow `instalar`.
- Caso mantenha o repositório antigo ainda na raiz, salve backup antes de atualizar.
- Sem rodar SQL.

## Testes recomendados (Android)
1. Gráficos 2D e 3D (restart, save persistido).
2. Portal Normal, PvP, Universo (entrada, destino, safe-zone).
3. Portais astrais Materializador 0, parcialmente completo, 100% (contagem, sem novas recompensas).
4. Bases Terra/Marte/Júpiter (troca mapa, venda/loja, zona segura, ícones no minimapa).
5. Halo, Nova e designers A–E no Hangar e em batalha.
6. Girar nave 360°; comparar pivo dianteiro e FPS com 2 jogadores.
