# V139.0 — coleta, salvamento e Valkíria

Atualização incremental sobre **V138 completa / 47.7.70**. Resultado: **47.7.71**.

## Correções entregues

A coleta falhava porque o papel `service_role` tinha EXECUTE nas funções novas, mas não tinha SELECT em `game_login_sessions_v1214` e `account_moderation_v1763`. O banco registrou `42501` no contexto de coleta. O salvamento durante a troca de casco também encontrou `42501` na consulta de `player_design_inventory_v16` feita pelo gatilho de seleção de design.

O SQL concede exclusivamente ao papel do servidor as cinco leituras necessárias e UPDATE apenas na coluna `ship_design_id` do loadout. Não altera as políticas dos jogadores, não converte funções para SECURITY DEFINER, não desativa RLS e não concede escrita no inventário de designs.

**`sql/STELLAR_V139_PERMISSOES_COLETA.sql` já foi aplicado no Supabase.** Uma leitura do contexto real foi executada com `SET LOCAL ROLE service_role` e retornou sucesso, sem coletar drops ou alterar o save de qualquer jogador. Ainda é necessário confirmar a coleta real no aparelho; não houve recibo novo de jogador na janela consultada após a correção.

A Valkíria original recebeu uma nova arte individual com enquadramento semelhante ao dos seus designs. O sprite antigo tinha muito espaço transparente. As cinco skins aprovadas continuam com os mesmos arquivos e atributos. Apresentação exportada em 2048×2048 de uma nova geração 1254×1254; mapa em 512×512. A escala física, os atributos e o alcance da nave continuam iguais.

## Base natalina: proposta visual

`docs/v139/BASE_NATAL_CONCEITO.png` é a prancha conceitual para aprovação, **não uma base já instalada no jogo**. Apresenta quatro setores: Missões, Comércio, Hangar e Portais Astrais, ao redor do reator natalino. A prancha é de 1536×1024.

O plano está em `docs/v139/BASE_MODULAR.md`. A integração dos módulos e dos sprites finais depende da revisão dessa proposta; esta atualização não muda a base atual nem os pontos de interação.

## Validação e instalação

**670 testes passaram**, incluindo o teste novo sob `service_role`: reproduz a falha antes do GRANT; após o SQL, confirma loot, recupera o recibo sem duplicar o ganho e muda de nave restaurando o design de propriedade do jogador. Os papéis anon e authenticated continuam sem acesso às funções de contexto.

`npm run verify` também verificou sintaxe, versões, imports e caminhos de arquivos. A validação anterior rodava como proprietário do banco; por isso não reproduzia a ausência dessas permissões. O novo teste cobre essa diferença.

Envie somente o ZIP V139 à raiz do repositório e execute o workflow universal existente. A base precisa estar em 47.7.70, com as duas partes da V138 instaladas. Aguarde o deploy do Render para receber a Valkíria e a identificação 47.7.71. A correção SQL já está disponível para o servidor V138 em execução.

Depois: testar coleta de box/loot com nave e AUX, durante combate; trocar nave/configuração; conferir a Valkíria normal; reconectar e conferir o estado confirmado.
