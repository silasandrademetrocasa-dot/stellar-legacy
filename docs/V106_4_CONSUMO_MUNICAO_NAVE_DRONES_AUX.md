# Stellar Legacy V106.4 — auditoria e persistência da munição

**Base:** V106.2 instalada. Pacote cumulativo de código da **V106.3 + V106.4**: não aplicar V106.3 separadamente.

## Diagnóstico no código anterior

- Nave e drones já consumiam a mesma munição, `min(equippedLaserIds().length, estoque)` por disparo principal. O dano acompanha os lasers que efetivamente dispararam quando o estoque é insuficiente.
- AUX-9, quando em **Modo Sentinela**, já consumia `min(petLaserIds().length, estoque)` por disparo defensivo, independentemente do principal. Não há bypass ADM no caminho `petFireAt`.
- AUX não dispara nos modos Companhia, Coleta, Mineração ou Reparo; apenas revida contra NPC que feriu a nave recentemente. Nova Burst não consome munição laser.
- Mísseis: 1 unidade por disparo. Outros lasers (drones) estão incluídos no tiro principal da nave.
- **Bug localizado:** o tiro PvE do AUX deduzia estoque em memória, mas não registrava evento `battlePassEvent('ammoUse', quantidade)` nem marcava imediatamente seu consumo para persistência local. Com encerramento da tela antes do próximo save de 7s, o último consumo podia não sobreviver à reinicialização. Além disso, o HUD misturava a cadência do AUX à previsão de rajadas da nave.
- Farm Offline V487 conta nave+drones, sem AUX. Não foi alterado: Sentinela exige dano real recebido, o que o simulador não representa.

## Correção V106.4

1. `laserAmmoShotBudgetV1064` centraliza o limite por munição disponível nas rotas de tiros nave PvE/PvP, AUX e relé. Sem exceção ADM, sem estoque negativo.
2. AUX PvE registra o consumo na estatística de uso e marca save local consolidado. O consumo da nave PvE também participa dessa consolidação.
3. A gravação local de munição fica limitada a no máximo uma vez a cada ~2s; mantém o fluxo de PUT periódico do Supabase, sem HTTP por tiro. Ao ocultar a página/tela, se houver consumo pendente, grava o save local e aciona a sincronização existente.
4. Tooltip distingue Nave + drones (-N/rajada) de AUX Sentinela (-M/tiro independente, só em revida). A previsão de rajadas da nave não supõe que AUX dispare junto; alerta de estado AUX é atualizado sem cache visual antigo.
5. Cache busting de `game.js` atualizado na página para a versão V106.4.
6. Presets PVE, PVP, FARM e BOSS e SQL de posição da V106.3 inclusos no mesmo ZIP cumulativo.

## Delimitações importantes

- Sem SQL adicional de munição; nenhum saldo, estoque ou inventário pré-existente foi modificado.
- **Servidor ainda valida o save econômico e limites de dano, mas não existe débito autoritativo por evento de tiro**. Esta correção melhora a lógica e o save local; não substitui uma futura liquidação de munição por hit no servidor, caso a economia exija defesa anti-clientes manipulados.
- Testes automatizados não comprovam efetividade em Android ADM/PvE/PvP. Antes de homologar, registrar estoque antes/depois de 10 rajadas estáveis, AUX revidando, relé, míssil, troca de mapa e reconexão; fazer o teste com e sem Sentinela.
- Não fazer deploy, migrar SQL ou instalar APK durante farm ativo. Encerrar Autopilot, esperar confirmação de save e só então atualizar.

## Testes

- `node --check public/game.js`
- `npm run verify` — **247/247 aprovados**, incluindo 7 novos cenários V106.4.
- Migração V106.3 permanece pendente; não foi executada.
