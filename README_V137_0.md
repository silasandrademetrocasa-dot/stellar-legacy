# Stellar Legacy V137.0 — Combate e artes aprovadas

## Escudos

A taxa de absorção é média ponderada pela capacidade dos geradores de escudo efetivamente equipados na nave, drones e AUX. O bônus da habilidade de piloto soma pontos percentuais ao resultado, limitado a 95%. O dano que excede a capacidade disponível do escudo vai para o HP.

**Exemplo:** 10.000 dano bruto / 80% de absorção / escudo 15.000 → -8.000 no escudo e -2.000 no HP.

## Assets

Os arquivos V137 são recortes **transparentes e individualizados** das pranchas aprovadas, exportados para WebP (nunca são usados os banners completos no mapa). Pastas: `public/assets/v137/equipment`, `drones`, `aux` e `portals`. O atlas AUX 4 × 4 preserva os 16 quadros aprovados; o AUX Elite permanece com arte própria antiga por falta de uma sheet Elite equivalente aprovada.

## Economia

Renomeados lasers por ID de inventário (ARC-1...ARC-6, ARC-X, ARC-Ω), mantendo `lf1/mp1/sl01/lf2/lf3/lf4/lfx/lfomega`; balanceamento e raridades de lasers, motores e escudos aplicados no catálogo `public/data.js`, com AEG-5 `fs05` de evento. Economia do banco requer validação da operação de compra e eventuais RPC antes do uso em produção.

Não executar arquivos SQL antigos em produção sem auditoria. Testar em pré-produção antes de substituir jogo ativo.
