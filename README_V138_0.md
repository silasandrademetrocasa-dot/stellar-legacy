# Stellar Legacy V138.0 — artes e coleta

Base: ZIP completo recebido em 11/11/2026, versão 47.7.69. Resultado: 47.7.70.

## Conteúdo

- 32 designs de nave: sete Elite/Natal, vinte de HP/dano/escudo/XP/velocidade para Lynx, Valkyrie, Leviathan e Striker, e os cinco países da Leviathan (Brasil, Estados Unidos, Japão, Espanha e Portugal).
- Cinco cascos Elite refeitos conforme a silhueta da própria família.
- Sete drones com geometria individual. Fury usa as lâminas vermelhas; Aegis usa os escudos azuis; Titan usa os cristais roxos. Seus atributos e IDs continuam iguais.
- Quatro NPCs natalinos, caixa e fogo separados, com câmera superior e transparência.
- Hangar, mapa, loja e prévias resolvem a mesma identidade. O caminho inexistente `ships/top` foi corrigido para `ships/map`; as prévias passam a usar a vista superior. O AUX Elite deixa de recorrer ao modelo antigo de outra família.
- Os três atlas antigos de Natal/naves são removidos pelo instalador. Não há recortes de células em tempo de execução.

## Resolução real

Os 50 arquivos de apresentação foram exportados em **2048×2048 WebP**, a partir de **novas gerações individuais de 1254×1254**. São exportações ampliadas, **não gerações nativas de 2K**. A resolução original, os caminhos e os hashes estão em `public/assets/v138/manifest.json`. Não foram ampliados os sprites antigos de 384 pixels.

O mapa usa cópias de 512×512. Prévias pequenas também usam essas cópias; imagens de apresentação e a galeria disponibilizam 2048×2048. Isso evita carregar todas as texturas 2K durante o combate. Abra `docs/v138/ARTES.html` após a instalação para conferir a coleção.

## Coleta e gravação

A coleta de box bônus e loot passa pelo WebSocket já autenticado. O servidor lê sessão, moderação, save, drop e recibo em uma chamada; a confirmação continua passando pelo mesmo commit atômico e pela trava da conta.

A posição usada para validar o alcance é capturada na chegada do pedido, antes de aguardar o banco. O AUX não fica selecionando a mesma caixa enquanto ela aguarda confirmação. Em caso de perda do canal, a alternativa HTTP usa exatamente o mesmo identificador de pedido, recuperando o recibo sem conceder o prêmio novamente. Rejeições de alcance, sessão ou regra de jogo não são reenviadas automaticamente por outro canal.

Posse do AUX, módulo comprado, alcance, mapa, sessão substituída, banimento, capacidade do porão e Farm offline continuam validados. Não se credita moeda no cliente antes da confirmação. A caixa natalina também deixa de impor uma pausa adicional de 1,5 segundo entre pedidos já concluídos; continua havendo apenas um pedido natalino em andamento por cliente.

## Instalação pelo workflow existente

Os pacotes são incrementais e devem ser aplicados **na ordem numérica**, um ZIP por vez na raiz, executando o instalador universal a cada parte. As primeiras partes só acrescentam artes: o jogo anterior continua usando os arquivos anteriores. A última parte instala o código, a versão 47.7.70, o catálogo e remove os atlas substituídos. Não envie todos os ZIPs simultaneamente: o workflow atual aceita apenas um por execução.

Os pacotes exigem a base 47.7.69. Não substituem `.github` nem o instalador. Os testes precisam passar antes de o workflow publicar a alteração. O pacote não modifica saldos, inventários ou recompensas de jogadores.

## SQL

`sql/STELLAR_V138_COLETA.sql`: contexto de coleta e revalidação da sessão no commit, sem substituir as demais alterações do núcleo V137. Somente o serviço do servidor pode chamar as duas funções novas.

`sql/STELLAR_V138_DESIGNS.sql`: reativa os 32 designs específicos de nave e atualiza suas referências visuais. Os seis designers universais antigos `ship_*` continuam aposentados. IDs, inventários e bônus existentes são preservados; não há débito ou crédito em contas de jogadores.

O estado de aplicação do SQL e os resultados dos testes constam em `docs/v138/VALIDACAO.md`.

## Limites da validação

Os testes locais cobrem PostgreSQL real embarcado, transporte WebSocket real, recuperação de recibos e consistência dos arquivos. O tempo real de coleta no Render/Supabase precisa ser medido após instalar a última parte. Não foi executada uma sessão autenticada com a conta de um jogador em produção.
