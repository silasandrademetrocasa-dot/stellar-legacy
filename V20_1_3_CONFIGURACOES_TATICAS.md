# Stellar Legacy V20.1.3 — Duas configurações táticas e remoção em lote

## CONF 1 e CONF 2

- **CONF 1 / CONF 2** no HUD ao lado do laser e no **Hangar → Equipamentos**.
- Cada CONF guarda lasers, geradores, extras e slots dos drones. O AUX-9 mantém equipamento compartilhado.
- A preparação de equipamentos continua **na base segura**; a troca de CONF pode ocorrer em combate e nos mapas PvP 4-X.
- **Cooldown persistente de 5 segundos após cada troca**, inclusive se recarregar. A seleção do alvo e o laser contínuo não são desligados pelo botão de CONF.
- As duas CONF reutilizam os mesmos itens reais da conta, **sem duplicar unidades no inventário**. Ao trocar, o motor devolve os itens ativos e reaplica o plano da próxima configuração dentro do estoque possuído. Se um item foi vendido, ele não reaparece.
- O primeiro acesso à CONF 2 recebe uma cópia do *plano de equipamentos*, **mas o escudo da nova configuração começa zerado**, para não criar escudo extra ao desbloquear o sistema. Ele poderá recarregar pelo sistema normal.
- Cada configuração salva o **escudo restante em unidades absolutas**, nunca porcentagem. Exemplo: CONF 1 tem 400.000 de máximo, sofre danos e fica com 205.000; alterna para CONF 2 e volta à CONF 1, que retorna com 205.000 (limitado à capacidade atual).
- A vida do casco é compartilhada e nunca aumenta ao trocar. A regra de espera após dano para regeneração também é compartilhada; escudos de uma configuração inativa **não regeneram**.
- Os saldos persistem no save local e no cloud save padrão do jogo. O servidor já armazena o estado em JSON; não é necessário aplicar SQL nesta versão.
- **Mudar de nave no Hangar** reinicia as duas configurações para a nave escolhida. Ajustar/salvar as configurações somente após escolher a nave desejada.

## Remover todos

Em **Hangar → Equipamentos**, clique **Remover todos • Nave + Drones**. A aba **Drones** também possui remoção em lote específica; na aba **AUX-9** existe remoção em lote dos equipamentos do AUX. Todos os itens retornam ao inventário e nenhum deles é vendido. Exige base segura e confirmação do usuário.

## Como testar

1. Instale o pacote no GitHub usando o workflow original e espere o Render publicar.
2. Na base, equipe escudos na CONF 1 e prepare velocidade/ataque na CONF 2. Aguarde a regeneração da CONF 2 antes de iniciar o teste de escudos.
3. Com a CONF 1 equipada, anote o escudo e receba dano de NPC até restarem 205.000.
4. Troque para CONF 2. Tente trocar de novo antes de 5s: deve bloquear.
5. Depois de 5s, volte para CONF 1. O escudo deve continuar em ~205.000 (só pode aumentar pelo pulso legítimo de reparo, respeitando o tempo desde o último dano).
6. Repita incluindo PvP, modo laser contínuo, relogin, compras, equipamentos ausentes e remoção em lote.

## Segurança e limites

A proteção contra curar o escudo por **troca de CONF, save, recarregamento e mudança de equipamento** é implementada no cliente. O serviço atual aceita um save JSON com integridade econômica parcial; **não constitui sistema completamente autoritativo para HP/escudo PvP**. Para um PvP competitivo resistente a clientes modificados, a próxima etapa seria transferir dano, HP e escudos ao servidor autoritativo.

## Compatibilidade

- Baseada integralmente na **V20.1.2**, preservando PvP contínuo, XP, lojas, itens de evento e sprites.
- 139 testes automáticos, incluindo 7 cenários direcionados de configurações.
- Sem migração SQL. O código só fica ativo após publicação.
