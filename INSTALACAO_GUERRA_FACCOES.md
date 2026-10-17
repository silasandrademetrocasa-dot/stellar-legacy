# Stellar Legacy — Instalação da Guerra de Facções

## Status do Supabase

**SQL JÁ APLICADO E VALIDADO no projeto `stellar-legacy` em 17/10/2026**, via integração autorizada:

1. `sql/V21_5_0_GUERRA_FACCOES.sql` — migração `stellar_v21_5_0_guerra_faccoes_completa`.
2. `sql/V21_5_0B_CLAN_SNAPSHOT.sql` — migração `stellar_v21_5_0b_clan_snapshot`.

**Não execute novamente os SQLs** no banco atual. Eles estão incluídos apenas para auditoria, recuperação e instalação em outro ambiente. A V21.4.0 também já tinha sido aplicada.

## Publicação

1. Confira no Render se o serviço utiliza as variáveis de ambiente `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`) e a **privada** `SUPABASE_SERVICE_ROLE_KEY` (ou `SUPABASE_SECRET_KEY`). Não exponha a chave de serviço no GitHub ou cliente.
2. Envie **somente** `stellar-legacy-V21.5.0-GUERRA-FACCOES-COMPLETA.zip` para a raiz do GitHub, sem extrair, removendo o ZIP de instalação anterior.
3. Em GitHub Actions: **Instalar versão do Stellar Legacy → Run workflow**.
4. Confirme o deploy/saúde do Render; o `Build Command` deve usar `npm install && npm run verify`.
5. Entre com a conta ADM e abra **MISSÕES → CENTRO DE COMANDO → GUERRA**. Verifique as regras e crie uma campanha **rascunho** primeiro. Só publique depois de ajustar datas e prêmios.

## O que testar

- **Domínio A, B e C:** capturar um ponto, desconectar, atualizar e reiniciar uma sessão; o dono deve permanecer. Uma facção rival só assume após concluir 100% da captura.
- **Defesa:** após um ataque inimigo de pelo menos 20% de progresso, repelir o adversário permanecendo um defensor junto ao relé. Deve registrar uma defesa no máximo a cada 10 minutos por piloto/relé.
- **Ranking:** conquistar com campanha ativa deve registrar pontos de piloto, facção e clã; mudar de clã **não** transfere os pontos já computados.
- **Suprimento:** com território controlado pela facção, resgatar Créditos uma vez por dia (data de São Paulo), testar repetição e reconexão.
- **Campanha:** crie uma campanha curta de teste com início futuro e premie somente após `ends_at`. Os territórios **não zeram** após o encerramento.
- **Segurança e economia:** valide com duas contas distintas; resgate repetido não cria moedas. Verifique também configurações da nave, escudos e salva local/nuvem.

## Regras de economia inicial

- Suprimento: **400 CR por relé** controlado, máximo **2.800 CR por dia/piloto**, configurável pelo ADM.
- Conquista: **10 pontos**; defesa válida: **3 pontos**, configurável pelo ADM.
- Prêmio padrão de campanha: **2.500 CR + 10 STL** por participante elegível da facção vencedora; facção derrotada elegível recebe **25% dos CR** e **nenhum STL**.
- Essas regras e datas são definidas no servidor. A primeira campanha **não é ativada automaticamente**, para evitar pagamento involuntário.

## Limites e esclarecimentos

- O SQL foi aplicado/validado, mas **o ZIP não foi publicado no GitHub/Render nesta entrega**. O serviço no Render ainda deve ser conferido com a chave de servidor.
- Não foram feitos testes multiplayer ponta a ponta no dispositivo; os testes são estáticos/unitários, banco e validação do pacote.
- Rankings de clã guardam o clã na primeira contribuição do piloto **dentro de cada campanha**; ao trocar de clã, o placar anterior não é reatribuído.
- Não houve reset de relés, inventários, progresso, banco ou migração destrutiva.
