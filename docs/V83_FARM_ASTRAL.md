# Stellar Legacy V83 — Farm Astral contínuo (47.7.39)

## Requisitos

- Instale **sobre V82 47.7.38** pelo Instalador Universal.
- Conta com permissão **AUTOPILOT** ativa no ADM.
- Nave viva, jogo online, aba visível e acesso ao X-1.
- Tenha munição e escudo adequados para enfrentar Aurora, Nexus ou Eclipse.

## Como iniciar

1. Abra **AUTOPILOT > ✦ PORTAIS ASTRAIS**.
2. Escolha Aurora, Nexus ou Eclipse.
3. Selecione **10× ou 50×** giros oficiais do materializador.
4. Defina um orçamento por montagem (STL) e um teto total de gastos. Para usar o saldo disponível até acabar, **teto total = 0**.
5. Escolha a quantidade de portais: `0` = repetir sem número máximo. Para não limitar por relógio, **Duração = 0** com o modo astral ativo.
6. Marque **combate assistido** e **farm astral contínuo**.
7. Toque em **♻ INICIAR FARM DO PORTAL** e confirme a autorização de gastos recorrentes no diálogo. Feche o painel para acompanhar o jogo.

## Sequência de funcionamento

- Busca a base X-1 usando viagens legítimas.
- Se houver portal já montado ou partida astral válida em andamento, entra sem girar de novo.
- Caso contrário, usa `gate_spin` **no servidor**, em lotes 50/10/5/1 conforme saldo e limites restantes. Lotes menores só completam orçamento residual.
- Usa o salto normal, ataca NPCs existentes pelo combate normal e aguarda a conclusão efetiva do portal.
- Somente após o contador oficial de portais concluídos avançar e o retorno ao X-1 se concretizar, reinicia a montagem.
- Contagem e gastos aparecem no painel e no relatório do Autopilot.

## Interrupções e garantias

- **PARAR**, aba oculta/fechada, mudança de conta, acesso negado, morte, reparo obrigatório, falha do portal, falta de STL, falta de munição prolongada, limite de orçamento/tempo/conclusões ou resposta econômica incerta.
- Uma compra que já foi aceita pelo servidor pode terminar mesmo depois de o usuário tocar PARAR. O ciclo **não** a reenviará automaticamente.
- A V83 nunca injeta XP, créditos, STL, peças, recompensas ou drops pelo cliente. As compras usam a economia oficial; as recompensas são entregues pelo sistema normal de conclusão.
- **Não há execução em background**. O modo contínuo não é retomado após atualização/reload: requer nova autorização explícita.
- Autopilot astral está separado do farm normal. O modo normal permanece com duração e orçamento próprios.

## Validação recomendada

- Primeiro testar **Aurora**, 10×, teto total **5.000 STL** e **1 portal**.
- Se estável, repetir com 50×, depois habilitar contínuo com saldo e teto escolhido.
- Confirmar nível, recompensas reais, contadores e que a nave não entra duas vezes no mesmo portal.

## Rollback

O ZIP `STELLAR_V83_ROLLBACK.zip` reverte **somente os arquivos** para V82 (47.7.38). Nenhuma alteração de banco, valores de economia ou save é feita pela V83.
