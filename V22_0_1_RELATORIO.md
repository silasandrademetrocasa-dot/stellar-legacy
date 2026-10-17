# Ajuste de navegacao V22.0.1 — velocidade nominal preservada

- **Velocidade exibida:** identica a V22.0.0, inclusive com habilidades ativas. Nao foi alterado `player.speed`, equipamentos, atributos ou economia.
- **Deslocamento fisico:** nos mapas PvE X-1–X-8 e PvP 4-1–4-3, o passo agora usa **72%** do deslocamento anterior, equivalente a **28% menos unidades por segundo**, sem alterar o numero de velocidade na interface.
- **CONF 1 / CONF 2:** bonus relativo de velocidade intacto. A CONF mais rapida ainda supera a CONF de escudos proporcionalmente.
- **Camera:** permanece proxima da nave, sem distorcao, sem mudar zoom e sem efeito de empurrar a tela.
- **Arenas especiais Aurora/Nexus/Eclipse:** ritmo temporizado intacto para nao alterar tempos de desafio.
- **Servidor multiplayer:** a posicao atualizada pelo cliente continua sendo enviada e propagada. Nenhuma regra de captura/escudos/dano foi alterada.
- **Supabase:** nenhuma migracao necessaria: a alteracao e somente a formula de navegacao no cliente. Preserva os tamanhos de mapa e donos dos reles existentes.

A numeracao da versao aparece somente no arquivo e metadados tecnicos, nunca nos titulos visiveis da interface.

## Teste sugerido

Comparar a mesma nave em X-1 ou 4-1 com mesma CONF e mesmos equipamentos; o numero VEL deve permanecer igual, mas o tempo para percorrer 1000u deve ficar cerca de 39% maior (1/0,72). Alternar CONF e verificar diferenca relativa. Testar mapas de portais especiais separadamente.
