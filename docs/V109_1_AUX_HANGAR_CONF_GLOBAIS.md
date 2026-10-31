# Stellar Legacy V109.1 — TESTE HANGAR AUX E CONFIGURAÇÕES GLOBAIS

## Regra confirmada
As configurações **CONF 1** e **CONF 2** são globais. Cada uma registra a nave, os drones e AUX-9 (lasers, escudos, modo AUX e **especializações existentes**). Alterar e salvar qualquer um desses elementos atualiza somente a configuração ativa. Trocar configuração restitui os itens do loadout anterior ao inventário, equipa o conjunto solicitado e recalcula estatísticas sem duplicar itens.

## Nova UI
HANGAR > EQUIPAMENTOS > AUX-9: navegação lateral (Informações, Armas, Escudos, Protocolos, Módulos), prévia do AUX e slots na área inferior. A aba Protocolos permite alterar as especializações legadas reais por configuração e mostra **prévia, sem efeito de jogo** das cinco famílias novas.

## Protocolos da V109.2+ planejados
DANO: 1%, 2%, 3%. HP: 1%, 2,5%, 5%. ESCUDO: 2%, 4%, 7%. BOX/LOOT: 1%, 4%, 7%. PORÃO: 5%, 10%, 15%. Níveis 1 loja, 2 craft, 3 eventos/craft Universo futuro. Os quinze sprites existem, mas **não** são compra ou equipamento ativo nesta V109.1. A integração econômica será transacional e autorizada pelo servidor.

## Segurança
- Não modifica moedas, drops, APIs de compra nem sistemas de combat do servidor.
- Mantém V108.1 login e Universo.
- Configurações legadas sem `petLoadout.protocols` migram com a distribuição atual; o inventário não é alterado.
- Trocas de CONF seguem o cooldown existente de 5 s e a gravação com intenção explícita.
- Testar primeiro Web e conta de testes, depois APK. Não misturar com o jogo completo na raiz.
