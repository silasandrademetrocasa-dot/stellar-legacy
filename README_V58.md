# Stellar Legacy V58.0 — Galactic Interface Refinement

**ZIP acumulado V55 + V56 + V57 + V58**. Base alvo: V54.0 ou superior. Não substituir a pasta inteira do jogo; instalar via **Instalador Universal**.

## Correções V58

- 13 perspectivas das naves novamente geradas dos GLBs mobile originais, agora com câmera acima da nave (cockpit e blindagem superior visíveis). Imagens na Loja, na seleção e no Hangar usam a nova origem V58.
- AUX-9 em perspectiva com GLB: a imagem fica somente na prévia superior do gerenciador. A imagem duplicada da ficha inferior foi retirada via CSS; slots, status, designers de AUX e protocolos mantidos.
- Botão **Base / Vender Recursos** fixado na viewport, sem reposicionamento constante com a câmera, visível somente se estiver na base e elegível no servidor.
- Tema CSS refinado e responsivo para menu superior, Hangar, Loja Premium, Porão e Serviços da Base, ADM e Configurações; elementos compactados também em orientação horizontal.
- Hangar: bloco de designer da nave compactado e limitado à área NAVES; removido o segundo atalho dentro da área de equipamentos. Nenhum designer AUX foi modificado.
- Fundo do mapa: base opaca navy sob a textura semitransparente para evitar exibir um fundo praticamente preto quando a imagem do mapa está carregada.
- Bases originais em perspectiva restauradas na V56 **permanecem preservadas**; não usar nenhum modelo de base alternativo.

## Pontos que necessitam cuidado

- **Designer único +25% ESC:** NÃO foi aplicado ao balanceamento real. Catálogo, designer atual, efeitos e inventário são mantidos para evitar romper bônus existentes. Exige definir uma migração específica do catálogo no servidor, que deverá ser aprovada separadamente. No V58 o painel apenas evita repetir todos os designers na tela.
- Layout V58 é uma implementação CSS/DOM, não uma reprodução pixel a pixel dos renders conceituais.
- Loja Premium mantém o modo de teste/simulação já configurado pelo servidor. Nenhuma compra em dinheiro ou item é concedido por esta atualização.
- Alterações de segurança, combate, preços, Farm, relés, rotas, inventário, escudos ou economia: **nenhuma**.
- Os testes automatizados garantem integridade de arquivos e invariantes; **teste visual, FPS e cliques no Android dependem do deploy**.

## Instalação e pós-teste

1. Guardar backup/commit da versão atual.
2. Deixar **exatamente um ZIP na raiz** do GitHub.
3. Actions > Instalador Universal > instalar; conferir `npm run check` e `npm test`.
4. Depois do Render, recarregar o PWA. Verificar Base X-1, venda de recursos, Loja Premium, ADM, Hangar horizontal, cada aba, CONF 1/2, loja e nave.
5. Se aparecerem problemas, restaurar o commit anterior no GitHub.

**Nenhum SQL necessário.** 47.7.13.
