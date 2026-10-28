# STELLAR LEGACY — V97 CUMULATIVA A+B (V92–V97)

Instalação direta: V91 `47.7.47` → V97 `47.7.53`.
Pacote C (Warfront/PvP/ADM competitivo/V100) **não incluído**.

## Entregas reais

- V92 • Farm Offline: relatório de conflito explica como verificar e proteger o save. Sem pagar recompensas rejeitadas retroativamente.
- V93 • APK: orientação horizontal/vertical movida para **Configurações**; o aviso de fullscreen foi removido do início. Ponte nativa `StellarAndroid.setLandscape()` instalada na `MainActivity`; navegador continua com fallback de gesto/manual. O APK continua servindo imagens/scripts/mapas localmente via `WebViewAssetLoader`.
- V94 • Autopilot Astral: relatório agora mostra ciclos concluídos, STL líquidos e uma estimativa de STL bruto obtido antes do custo do materializador. Sem tocar em compras, recompensas ou autorização. A validação real de uma hora de Autopilot continua dependente do teste do jogador.
- V95 • Progressão de Comando: aba Configurações → Ranking mostra XP para o próximo nível e setor seguinte; não altera os limites de XP nem os saves.
- V96 • Missões de fronteira: guia de setores X-5/X-6/X-7/X-8 integrado ao painel de missões. Os contratos existentes e seus IDs não foram modificados.
- V97 • Endgame: guia mostra a exclusividade dos dois Apex no X-7 e o aviso de que chefes lendários não podem participar do Farm Offline. Nenhuma mudança econômica ou de spawn foi aplicada ao Supabase.

## Compra de munição em lote — atenção

- A Loja permite escolher o produto e **digitar o mínimo de unidades** desejadas.
- O preço do catálogo refere-se a pacotes completos: 1.150 unidades desejadas com pacotes de 1.000 serão 2 pacotes e **2.000 unidades entregues**. Isso é apresentado antes da confirmação.
- Uma única chamada `POST /api/live/purchase/bulk` valida a sessão, o preço do Supabase/Live Ops, nível, saldo e limite de estoque, e executa **uma gravação de compra** no save do servidor.
- A confirmação traz o preço esperado, a moeda e a quantidade por pacote; se o ADM mudar a cotação, a compra é rejeitada sem débito.
- O identificador de requisição é salvo junto com o save para evitar uma segunda cobrança do mesmo pedido; o cliente não faz loop de requisições nem repete automaticamente compras com resposta incerta.
- Quantidade permitida: 1 a 2.000.000 unidades desejadas, no máximo 500 pacotes por operação, com limite adicional de custo/estoque.
- Operações de compra durante Farm Offline são bloqueadas para preservar a liquidação.

## Limitações e critérios de aceite

- 145/145 testes automatizados após instalação (V91: 136/136).
- O pacote foi testado com o Instalador Universal e rollback; não equivale a teste de compra real com autenticação e Supabase ou a compilação de APK.
- Não há SQL nesta entrega; o acesso ao Supabase de produção não foi suficiente para validação em tempo real. Nenhum saldo foi alterado.
- Após publicar no Render, **recompile o APK** para embutir JavaScript, a nova interface e a ponte de orientação da V97.
- Validar no Android: login sem aviso de fullscreen, Configurações → Horizontal, Configurações → Vertical, Loja → compra de munição 10.000 unidades, confirmação e saldo, Farm Offline 30 min, Autopilot Astral 1 hora, missões e XP.
- APK offline de recursos continua com login, multiplayer, economia e saves online: não é um aplicativo totalmente offline.
- Até confirmação dos seus testes de farm/autopilot, esta entrega não altera o fluxo financeiro dessas rotinas.
