# Stellar Legacy — V109.2: Hangar da Frota + Designers

## Base e instalação

- **Incremental sobre V109.1**. Não é o jogo completo.
- Compatível com o Instalador Universal do projeto: carregar o ZIP na raiz do repositório, mantendo os demais arquivos.
- Web primeiro; testar com piloto de testes na base X-1; depois validar APK.
- Nenhum SQL, compra nova, craft, drop, moeda ou alteração do servidor.

## Entregue

1. **NAVE** no Hangar > Equipamentos: menu lateral Informações, Armas, Escudos, Motores, Extras e Designers; grande vitrine da nave ativa; slots e inventário abaixo.
2. **DRONES**: o mesmo padrão visual, com menu Informações, Armas, Escudos e Designers. Seletor para cada drone possuído; equipar no drone selecionado, sem desviar o equipamento para o primeiro drone da lista.
3. **AUX-9**: preserva Informações, Armas, Escudos, Protocolos, Módulos; acrescenta **Designers** no mesmo menu. O catálogo futuro de protocolos permanece apenas como prévia visual.
4. **Designers**: catálogo validado pelo servidor já existente para nave/AUX e individualmente por drone, com nome, raridade, miniatura do design, bônus, quantidade e estado da seleção.
5. **CONF 1 / CONF 2**: o seletor global existente segue equipando nave + drones + AUX e suas especializações funcionais; o cooldown existente é preservado.
6. Reaproveitamento de componentes e artes locais atuais, sem modelos 3D novos, renderização de canvas em múltiplos cards ou alteração do loop de batalha.

## Limite intencional (importante)

O servidor mantém os **Designers** em seu inventário/loadout próprio. Na V109.2 o usuário pode visualizá-los, equipá-los e removê-los nas três categorias, mas **a troca de CONF 1 ↔ CONF 2 não alterna Designers automaticamente**: a V109.1 já trocava os *equipamentos* da frota e protocolos AUX, mas não tinha snapshots de designers transacionais por configuração. Associar Designers à CONF exigirá mudanças coordenadas no save/API do servidor e testes de rollback; não foi simulado no cliente para evitar desincronização de bônus/atributos.

## Validação

- `node --check public/game.js` — aprovado.
- `npm run check` — aprovado: 231 JS, 309 caminhos de assets, HTML/imports/Render.
- `npm test` — 294/294 aprovados após atualizar asserts antigos da V58/V105/V106 que exigiam o layout e identificador anteriores.
- Sem garantia de teste visual em navegador ou produção, confirmar comportamento na Web e com conta de testes.

## Testes manuais sugeridos

1. **NAVE**: alterar arma/escudo/motor/extra na base X-1; verificar retorno do item ao inventário, stats e nave selecionada; testar Designers equipar/remover de nave ELITE.
2. **DRONES**: com 2+ drones, selecionar Drone 2, equipar laser e conferir que Drone 1 fica intacto. Alternar Armas/Escudos/Designers; vender apenas o selecionado após confirmar.
3. **AUX-9**: entrar em Designers e equipar/remover o design autorizado. Acessar Protocolos, conferir especializações existentes e as 15 imagens futuras sem botões de compra.
4. **CONF**: configurar FARM na 1 e DEFESA na 2; alternar e confirmar inventário sem duplicações, equipamentos e protocolos corretos; observar que Designers **não** acompanham a troca nesta versão.
5. Conferir resolução mobile retrato/paisagem, desempenho e ausência de erro no console ao abrir/trocar abas.
