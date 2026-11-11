# Stellar Legacy V141.0 — interface, AUX fixo, artes e limpeza

Versão técnica 47.7.73. Atualização incremental para V140 / 47.7.72.

Suba o ZIP na raiz pelo workflow universal já utilizado. O instalador substitui os arquivos listados e remove os 98 caminhos do manifesto. Não extraia apenas os arquivos por cima: isso deixaria os arquivos aposentados no repositório. Não precisa aplicar SQL novo.

## Alterações

- Removido o botão verde flutuante de venda. Comércio continua no totem e nos painéis existentes; a regra que fecha a venda presencial ao sair da base continua funcionando.
- Natal e fogos agora ficam dentro da navegação superior. Os mesmos handlers, permissões e regras de uso foram preservados. A barra permite rolagem horizontal em telas estreitas, e os atalhos acompanham o recolhimento do cabeçalho.
- AUX local, remoto e prévia do hangar usam um sprite superior estático. Não há ciclo de quadros, mudança de perspectiva ou rotação pela direção do movimento. O nível, especializações, coleta e combate permanecem iguais.
- 34 NPCs comuns/Universo têm enquadramento individual medido pelo alpha do próprio arquivo. A margem transparente não reduz mais o casco visível. NPCs comuns: 96–152 unidades visuais; chefes: 118–280. O Apex recebe escala de chefe. Barras e seleção acompanham o desenho; os raios físicos e atributos não foram alterados.
- Renovados os cascos normais Aurora, Pioneer, Raptor, Lynx, Meridian, Bastion e Leviathan com a silhueta e cores atuais. Designs de países e atributos continuam nos seus próprios sprites.
- Loading natalino vertical e horizontal refeito com mais detalhe. Cada orientação pré-carrega apenas sua imagem. Materializador astral passa a usar Aurora/Nexus/Eclipse do mesmo conjunto dos portais do mapa.
- Cartões pequenos e preloader de combate usam os arquivos leves de mapa. A variante HD é solicitada pelas prévias grandes; não carregar sete texturas 2048×2048 apenas para cartões pequenos.
- Bases natalinas V140 mantidas em X-1 e X-8 nas três facções. Operações astrais continuam sujeitas às regras de X-1 já existentes.

## Limpeza e caminhos

98 arquivos aposentados, 9.218.322 bytes removidos antes de acrescentar as novas artes. Inventário com motivo por arquivo: `docs/v141/ARQUIVOS_REMOVIDOS.json`.

Inclui atlases e quadros antigos do AUX, cópias de sprites, loading anterior, aliases de NPCs sem uso e duas pontes de módulos aposentadas. A implementação de protocolos V110 removida era idêntica byte a byte à V1131: servidor e testes agora importam a mesma V1131 que o cliente.

Diretórios com carregamento dinâmico ou fallback ativo foram preservados. Uma pasta ter número antigo não significa que esteja sem uso. Migrações e fixtures SQL históricas utilizadas nos testes também foram mantidas; nenhuma função, tabela ou dado de jogador foi apagado no Supabase nesta entrega.

## Resolução real das artes

As sete fontes geradas têm 1280×1280; os arquivos HD são exportados em 2048×2048, com reamostragem declarada em `public/assets/v141/manifest.json`. São novas renderizações detalhadas, mas não fontes nativas 2K. Mapa: 384×384. AUX: 512×512 a partir da fonte de 1280×1280. Loading: resolução nativa aproximada de 1672×941 e 941×1672. Não confundir tamanho de exportação com detalhe nativo.

As artes foram geradas a partir dos sprites aprovados com a ferramenta de geração de imagens. Direção dos prompts e critérios em `docs/v141/DIRECAO_ARTES.md`.

## Validação

Suíte de regressão e casos novos de enquadramento, roteamento de skins, AUX estático e inventário de remoção. Auditoria de sintaxe/imports/assets e inventário de recursos locais do APK. Aplicação do pacote pelo instalador universal sobre uma cópia da V140.

O teste visual automatizado em Chromium foi tentado, mas o processo foi bloqueado pelo ambiente ao criar o socket local (`Operation not permitted`). Não é uma validação de toque ou FPS em aparelho real. Após o deploy, verificar no Android: barra em retrato/paisagem, abrir Natal e fogos, interação dos totens, AUX parado/em movimento, Scout/Support/chefes em X-1/X-8/Universo e reabrir o hangar com designs próprios.
