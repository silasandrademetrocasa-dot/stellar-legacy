# Stellar Legacy V18.2.5 — ADM BOX BÔNUS / POEIRA STELLAR LIVE

## Instalação
1. A estrutura do Supabase de produção **já foi criada e validada** (10/10/2026): `bonus_box_config_v1825`, `get_bonus_box_config_v1825()` e `admin_update_bonus_box_config_v1825(jsonb)`.
2. Suba `stellar-legacy-v18.2.5-ADMIN-BONUS-LIVE.zip` pelo instalador de ZIP do GitHub e aguarde o Render ficar LIVE.
3. Abra o jogo como ADM → **ADM → BOX BÔNUS**. Use **RECARREGAR** para ler as configurações, ajuste os valores e pressione **SALVAR CONFIGURAÇÃO BÔNUS**.
4. Os jogadores recebem as novas regras na próxima sincronização (em geral em até 45 s); o servidor sempre consulta o preço publicado na cobrança dos giros.

**Não precisa rodar SQL novamente no banco de produção.** Se instalar em outro Supabase, rode `sql/V18_2_5_ADMIN_BONUS_LIVE.sql` uma vez, antes de subir a versão.

## Controles ADM
- **Mapas:** define 0–100 caixas por setor X-1, X-2, X-3, X-4, 4-1, 4-2, 4-3. **Portais Astrais não possuem BOX BÔNUS** mesmo após edições.
- **Respawn:** mínimo e máximo em segundos, de 5 a 3600, respeitando mínimo <= máximo; caixas em cooldown já existente conservam a hora original.
- **Recompensas:** sete prêmios (PLS-1, PLS-2, PLS-3, SIP-2, CR, STL, Poeira). Cada um tem mínimo, máximo e PESO entre 0 e 100. PESO 0 desativa o prêmio. O sistema normaliza os pesos relativos. Uma BOX dá somente um tipo de prêmio.
- **Materializador:** define por portal Aurora, Nexus e Eclipse o custo em STL por giro e o custo em Poeira por giro. O percentual de desconto Premium é editável (0–50%) e só atua nos giros pagos em STL.
- **Loja Comum:** os preços de `gate_spin:*` no banco continuam sincronizados ao salvar o editor BOX BÔNUS. A aba BOX BÔNUS é a autoridade para custos de materializador.

## Segurança e persistência
- Somente o ADM autorizado pode salvar a configuração. Validação também executada no Supabase, não apenas na tela.
- Jogadores comuns não podem escrever diretamente na tabela de configurações; a função pública de leitura exige login.
- Cobrança da Poeira e de STL acontece no servidor, usando as mesmas configurações salvas no Supabase.
- Caixas continuam individuais por piloto e mapa, com posições e cooldown persistentes no save; o AUX-9 Salvager segue coletando.
- Este release preserva Smart Missions, cupons, Loja, Passe, Live Events e otimização Mobile Lite.

## Testes
- RPC administrativa com alteração temporária de 20 → 25 caixas no X-1 (transação revertida).
- RPC com conta comum → acesso negado.
- Preço inválido de Poeira 0 → recusado pelo banco.
- Modo mobile, confirmação da Loja, interface de cupons, migração das BOX e Smart Missions verificados por testes automatizados.

## Observações
- O materializador usa preços do servidor no momento de cada confirmação; uma alteração administrativa entre abrir e confirmar pode resultar em cobrança diferente da prévia exibida. Quando isso ocorrer, o jogo informa o resultado retornado pelo servidor.
- O sorteio de recompensa das BOX ainda segue a arquitetura de coleta e save existente no navegador; a autenticação de conta e as verificações de limites de economia seguem os mecanismos já existentes no jogo.
