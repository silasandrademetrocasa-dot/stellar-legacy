# Riscos e trabalho pendente

## Impede declarar a reestruturação completa

1. **Ledger econômico assíncrono ainda não implementado.** É necessário um contrato central de eventos, validação de provas de recompensa no servidor, fila persistente, IDs/seq por dispositivo, confirmação/rejeição por lote e rebase de operações dependentes. O transporte delta de checkpoint não substitui esse trabalho.
2. **Projeções otimistas de economia ainda não implementadas.** Comprar, vender, coletar BOX e receber prêmio seguem as rotas autoritativas anteriores. Para liberá-los localmente, o projetor precisa separar saldo/estoque provisório e confirmado, preservar consumo de munição durante a espera, remover efeitos rejeitados sem apagar progresso legítimo e identificar operações já embutidas em snapshots concorrentes.
3. **Autopilot:** movimentação/combate existentes foram preservados; compras/vendas ainda aguardam suas confirmações. Não foi demonstrado farm contínuo com rede desconectada.
4. **Multiplayer e recompensas:** NPCs, PvP, leilões, transferências, clãs, premium e prêmios competitivos continuam dependentes da autoridade atual. A simulação local não foi transformada em prova confiável de abate ou resultado compartilhado.
5. **Módulos legados e RPC:** foram inventariados, não removidos. A fila de tarefas de limpeza deve verificar os consumidores e seus testes antes de desativar cada rota.
6. **Farm offline:** permanecem cálculo/guarda/recibos atuais. Não foi criado novo protocolo com âncora de tempo do servidor e períodos de resgate auditados para a nova fila econômica.

## Riscos da cumulativa aplicada

- Cache de configurações pode mostrar preços/regras antigos por cerca de cinco minutos mais o próximo acesso. Operações definitivas continuam usando as regras do servidor. Use refresh explícito no painel administrativo.
- Delta depende de referência em memória da instância do Render. Reinício/evicção/sem afinidade de instância pode aumentar fallback e reduzir benefício. Não causam autorização ou commit baseado em referência desconhecida.
- Não foi feita compressão nova nem delta SQL no caminho Render/Supabase; o armazenamento continua consolidado. O custo de banco por transação econômica ainda pode ser alto.
- Detector local de segurança usa serialização JSON a cada sete segundos. O custo no Android modesto precisa ser medido. Não foi usado hash criptográfico a cada frame.
- SHA-256 local detecta corrupção; não é segredo nem proteção contra um usuário que modifica estado e checksum. A integridade definitiva continua sendo do servidor.
- IDs de compra mais duráveis não são uma fila de operações: o reenvio após reinício ainda depende do fluxo de recuperação/tentativa. Não existe promessa de confirmação econômica automática de todos os pedidos offline.
- O staging que falha é preservado em memória, mas não sobrevive a encerramento do processo se o próprio armazenamento recusou a gravação. O espelho legado é compatibilidade, não garantia contra quota cheia.
- A/B/C não resolve apagamento do armazenamento ou corrupção de todas as gerações. Os testes de transação não simulam falha física de disco/energia.
- O teste Java foi ignorado por falta de JDK. Chromium foi impedido por socket Unix. Não há APK compilado nem execução no Moto E7 ou outro Android.

## Próximos marcos verificáveis

1. Implementar um endpoint batch com recibos e versões por evento, usando as regras econômicas centrais e mantendo transações compartilhadas autoritativas.
2. Integrar fila e projetor de suprimentos/porão e medir Autopilot em rede lenta, antes de migrar todos os módulos.
3. Integrar BOX com emissão autoritativa, identificador de drop, prévia determinística autorizada e replay sem duplicação.
4. Integrar missões, craft/protocolos/passe e farm offline com provas, relógio de servidor e rejeição/rebase por dependência.
5. Fazer captura antes/depois no mesmo Android e ambiente de homologação; só então remover consumidores/rotas antigas comprovadamente inativos.

Esta lista é trabalho não concluído, não uma indicação de que as nove fases já estejam aprovadas.
