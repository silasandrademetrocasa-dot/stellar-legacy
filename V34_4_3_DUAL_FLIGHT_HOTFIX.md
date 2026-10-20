# STELLAR LEGACY V34.4.3 — DUAL FLIGHT SYNC

Correção focada na travada visual ao acompanhar dois pilotos cruzando o mapa com velocidade contínua.

- Janela visual de snapshots de 160ms para 105ms; previsão de cruzeiro com limite 235ms em vez de 65ms.
- Movimento remoto usa timestamps do servidor para reduzir flutuações de recepção entre pacotes.
- 100ms entre pacotes de movimento (antes 150ms); servidor continua validando velocidade e limitando frequência a 80ms.
- Pacote explícito ao concluir o percurso para evitar inércia visual na chegada ao portal.
- Janela adaptativa de correção visual com limite de atraso espacial; registros independentes por piloto.
- Sem mudanças em dano real, velocidade, moedas, saves, ADM ou eventos. Sem SQL novo.
- Instalar via ZIP universal; preservar .github.
