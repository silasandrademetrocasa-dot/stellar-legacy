# STELLAR LEGACY 34.6.4 — Correção do registro de ataque ao relé

## Diagnóstico confirmado
No `attachSharedUniverse()` a callback `readRelayLoadout` estava definida em `server/index.js`, porém não era recebida nem anexada ao objeto `world` em `server/world.js`. Assim, em `Room.handleRelayAttack`, `this.world.readRelayLoadout(p.userId)` disparava `TypeError` e o `catch` ocultava a causa mostrando mensagem genérica. Nenhuma chamada à RPC de dano era feita.

## Correções
- Conecta `readRelayLoadout` ao controlador websocket, sem confiar em dano enviado pelo cliente.
- Etapas `loadout` e `database` têm erros separados, com logs de diagnóstico e códigos seguros na resposta.
- Mantém dano da nave, drones, AUX, munição, habilidades e limite anti-abuso calculados exclusivamente no servidor.
- Valida no endpoint ADM HP até 12.000.000 e escudo até 8.000.000 conforme os novos limites do banco já aplicados.
- Não altera saves, HP, escudo, créditos, relés ou custos de módulos: os limites, 6M/3M e preços 100k/1M/3M já foram migrados diretamente no Supabase.
- Nenhuma alteração na pasta `.github` ou fluxo do Instalador Universal.

## Instalação
Instalar o ZIP completo com o Instalador Universal e aguardar Render Live. **Não precisa executar SQL adicional** nesta correção. Confirmar ataque no relé, redução real do escudo/HP no painel e os novos campos do ADM.
