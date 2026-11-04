# Stellar Legacy V121.1 — migração local-first do jogador (cumulativa V121.0 + V121.1)

## Entrega implementada
- `saveGame()` chama primeiro a persistência IndexedDB V121; `localStorage` continua espelho de compatibilidade enquanto leitores legados existirem.
- Ao entrar, a fonte local agora é escolhida entre IndexedDB (SHA-256 validado) e fallback localStorage, pela data do cliente, com verificação de conta; o fluxo existente de reset ADM, conflitos e autoridade remota permanece intacto.
- Escritas locais são coalescidas por jogador (250 ms), sem gravar um evento financeiro para cada frame de combate.
- Toda intenção explícita de alterar a montagem ou CONF1/CONF2 é armazenada atomicamente no IndexedDB com a fotografia completa e UUID; durante as edições, somente a versão desejada mais recente é enfileirada.
- A intenção de hangar é marcada como atendida somente depois da confirmação existente de save na nuvem para aquela assinatura; **essa marca local não é recibo econômico nem substitui a transação do Render**.
- Falha/limitação do IndexedDB não bloqueia login: o jogo mantém compatibilidade legada, com registro de erro; desligamento de emergência: `/?localfirst=0`.

## Não concluído — NÃO ativar `enforce`
- O servidor ainda é autoridade para Créditos, Stellarium, aquisições, vendas, leilão, missões com prêmios, PvP e Warfront.
- As chamadas HTTP antigas ainda existem; o gateway de sincronização da outbox em lotes de 5 segundos continua pendente (V121.2).
- Não existe conversão completa do modelo SQL, nem reset das 6 contas. O catálogo oficial da V121.0 já está instalado.
- O save completo local ainda contém cópia de economia recebida do servidor, **nunca um comando econômico validado**.

## Instalação
- Instalar somente o ZIP cumulativo `STELLAR_LEGACY_V121_1_CUMULATIVA_LOCAL_FIRST_HANGAR.zip` pelo Instalador Universal.
- O pacote contém tudo da V121.0 mais os módulos atualizados da V121.1. Não é necessário novo SQL.
- Abrir o jogo normalmente; testar CONF1/CONF2 no hangar e reentrada. Consultar console apenas em caso de falha, sem expor credenciais.
- Reverter se necessário: usar `/?localfirst=0` até restaurar a release anterior.

## Testes
- `node --check public/game.js`
- `npm run check`
- `npm test`
- `node --test tests/v1211-migration.test.mjs`

## Proxima cumulativa V121.2
Integrar fila local a endpoint autenticado, com recibos idempotentes reais no Render/Supabase para **comandos não econômicos primeiro**. Para compras e recompensas, manter debitagem e concessão atômicas do servidor. Não substituir dados de 6 jogadores pela cópia local em um batch sem preflight.
