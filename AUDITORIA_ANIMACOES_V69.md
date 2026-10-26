# Auditoria das artes e integração V69

- Fonte de portais: atlas RGBA 1448 × 1086, **6 linhas de 8 células de 181 × 181 px**.
- Cada célula exportada em canvas WebP RGBA de 256 × 256 com área transparente e corte de segurança nas bordas; halo/fragmentos isolados de linhas vizinhas mascarados.
- Renderização: o frame base (anel/corpo) é estático, enquanto apenas o centro de 63px de diâmetro (na tela) pode mudar nos quadros. Não gira nem muda a dimensão da estrutura inteira.
- Fonte de bases: três animações de **12 quadros PNG RGBA 840 × 490**, reexportadas para WebP para carga leve. A base estática original PNG permanece no pacote.
- Fonte de relés: 3 × 8 PNGs (largura 221-222; altura 295-296). Muitas células possuem elementos gráficos cortados no limite e possíveis peças da célula vizinha. Para não reproduzir essas contaminações, a silhueta de estado_01 foi isolada conservadoramente; referências de estados foram guardadas, sem assumir a semântica de cada número.
- Sem criação de colisores, novos ataques ou recompensas. Relés usam os mesmos `node.x`, `node.y`, `node.id`, `hp`, `shield`, `contested` e eventos de disparo já produzidos pelo sistema online.
- Alterações de qualidade: apenas apresentações visuais, não afetam regras.
- Próxima revisão de arte: exportar separadamente peças luminosas, bolhas de escudo e disparos de relés, com 20% de margem real para cada efeito.
