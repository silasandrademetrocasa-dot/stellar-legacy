# STELLAR LEGACY — V61 (V60 + V61 cumulativas, inclui V55–V59)

Esta é uma **atualização incremental** para o Instalador Universal. Coloque **somente este ZIP na raiz** do GitHub e execute **Actions → Instalador Universal → instalar**. Não envie a pasta descompactada e não rode SQL.

## V60 — Exibição premium
- Galeria de naves no Hangar e Loja com prévia em perspectiva, usando o GLB quando o modo 3D está disponível e a imagem 2D como fallback.
- Drones com visualização ampliada em perspectiva; AUX-9 na Loja com prévia.
- Ajustes de estilo exclusivos nos cards, preservando componentes existentes.

## V61 — Modelos no mapa e NPCs
- Corrigida associação dos **13 IDs de naves** aos GLBs HQ `SL_*_HQ.glb` em **Configurações → Visual do Jogo → 3D**. Modo Automático continua usando os modelos LOD para preservar o desempenho.
- Corrigida autorização dos oito modelos de NPC do Universo (Aurora/Nexus/Eclipse/U-X), que agora podem ser desenhados usando o pipeline 3D real; fallback 2D permanece em falhas.
- Mapa, loja e hangar compartilham a família real de assets, sem alterar as estatísticas dos itens.

## Limitações e testes necessários
- A geometria HQ desta versão foi reaproveitada da V59: **não** representa 13 esculturas exclusivas novas feitas do zero. Algumas silhuetas ainda podem ser semelhantes.
- Testes automatizados validam código/associação/instalação, **não** substituem teste visual e medição de FPS em Android. No modo 3D explicitamente ativado, observe FPS em mapas com muitos NPCs e jogadores.
- Itens e recompensas permanecem vinculados ao servidor. Sem alterações em SQL, economia, contas e salvamentos.
