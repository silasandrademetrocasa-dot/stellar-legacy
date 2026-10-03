# Stellar Legacy V12.1 — P.E.T. Autônomo

## IA / movimentação
- P.E.T. deixa de orbitar como um drone e passa a patrulhar livremente quando a nave está parada.
- Quando a nave se move, acompanha com distância e deslocamento lateral, sem ficar colado.
- Sprite do P.E.T. agora aponta para a direção real de movimento em vez de girar continuamente.
- Tether ampliado para permitir exploração dentro da área operacional sem perder o jogador.

## Prioridade de combate
1. Se o piloto estiver disparando contra um alvo, o P.E.T. abandona imediatamente qualquer coleta ou patrulha e ajuda no MESMO alvo.
2. Quando o piloto está livre, o P.E.T. procura automaticamente o alien vivo mais próximo dentro do radar.
3. Nos modos BOX/Pedras, a coleta continua sendo a tarefa principal; se não houver item disponível, o P.E.T. volta ao combate automático.
4. O comportamento automático respeita zonas seguras: o P.E.T. não inicia caça automática dentro da base/portal neutro.
5. Assistência ao alvo selecionado também suporta PVP quando o piloto estiver efetivamente atacando um jogador hostil.

## Coleta / radar
- Coletor de BOX usa o mesmo raio do minimapa (`state.radarRange`).
- Coletor de Pedras usa o mesmo raio do minimapa.
- O painel do P.E.T. mostra o alcance real de radar/busca.

## HUD
- Status flutuante informa: ASSISTINDO SEU ALVO, CAÇANDO, BUSCANDO BOX, BUSCANDO PEDRA, REPARANDO, PATRULHANDO ou ESCOLTANDO.
- Tooltip de munição passa a separar corretamente consumo de lasers da nave e consumo potencial do P.E.T.
