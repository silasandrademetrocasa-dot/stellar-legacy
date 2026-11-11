# Revisão das artes — V140

Revisão dos arquivos e caminhos efetivamente usados no cliente da V139/V140, com inspeção visual dos sprites. Um diretório antigo não significa, sozinho, que a arte está errada; abaixo estão as pendências concretas de resolução e identidade.

## Prioridades para a próxima renovação

| Conjunto | Situação confirmada | Próxima ação sugerida |
|---|---|---|
| Loading de Natal | Tema correto, porém arquivos servidos de 373×631 (vertical) e 582×361 (horizontal). Inspeção confirmou o Natal nas duas imagens. | Recuperar os originais aprovados de maior resolução antes de produzir outra composição. Ampliar os pequenos não recupera detalhe nativo. |
| Sete cascos normais | Aurora, Lynx, Pioneer, Raptor, Bastion, Leviathan e Meridian usam arquivos de mapa de 384×384, do conjunto V136. Não têm o mesmo master individual do novo conjunto de designs. | Padronizar a qualidade respeitando a silhueta atual; gerar apresentação e derivado leve de mapa separadamente. |
| AUX e seus designs | Modelo V137 de 256×256 e animação existente de 16 quadros. O caminho visual é escolhido pelo modelo/nível, enquanto o design adiciona cor/efeito; não há sprite individual por design como nos drones novos. | Definir e aprovar modelos específicos se a intenção for mudar toda a geometria por design. |
| Materializador dos Portais Astrais | O painel ainda usa `v53/sprites/astral_aurora`, `astral_nexus` e `astral_eclipse`, com dimensões próximas de 586–609 pixels. | Unificar a identidade do materializador com os portais mais recentes. Os portais do mapa já usam o pacote V137. |

## Artes já tratadas

- Bases: três modelos aprovados, em perspectiva, agora integrados a X-1 e X-8; arquivos de mapa estáticos e transparentes na V140.
- Cinco cascos Elite e sete designs Elite/Natal: novos sprites individuais V138.
- Vinte designs de atributos e cinco países da Leviathan: imagens próprias por nave, V138.
- Valkíria normal: enquadramento renovado na V139. As cinco skins mantêm seus arquivos aprovados.
- Drones: sete formas visuais individuais; Fury, Aegis e Titan têm resolução explícita para suas próprias geometrias.
- NPCs, caixa e fogo natalinos: arquivos individuais da V138.
- Lasers, escudos e motores: ícones do pacote V137.

## NPCs comuns e do Universo

Continuam usando as artes do pacote V136, em vista superior e com caminhos individuais. A inspeção feita nesta sequência não encontrou o problema de recorte de células vizinhas no resolvedor atual. Ainda não receberam o mesmo tratamento de masters individuais da V138; uma próxima revisão em maior resolução é adequada, sem presumir que os arquivos atuais estão falhados.

As antigas imagens genéricas `scout`, `heavy`, `fighter`, `miner` e `elite` não são mais os caminhos usados pelo registro atual de NPCs do jogo. O materializador astral é uma pendência de painel, não uma indicação de que os portais do mapa continuam antigos.

## Limites desta revisão

Não foram refeitas essas artes adicionais nesta atualização, nem alterados catálogos, probabilidades, atributos, preços ou ownership. O objetivo foi integrar as bases aprovadas e identificar o que falta padronizar visualmente. A inspeção é do pacote preparado; o conteúdo servido em produção depende de concluir o workflow e o deploy.
