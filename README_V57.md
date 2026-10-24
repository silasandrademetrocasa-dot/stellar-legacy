# Stellar Legacy V57.0 — Central ADM Galáctica (V55+V56+V57 acumuladas)

**Base necessária:** V54.0 (47.7.9) ou superior. Um único ZIP instala as alterações de V55, V56 e V57 sem apagar sistemas legados.

## Central ADM V57
- Novo layout neon, responsivo, nos mesmos padrões do Hangar, com categorias e subtelas para Painel, Jogadores, Mundo, Universo, Farm, Combate/Clãs, Economia, Eventos, Sistemas e Segurança.
- Farm Offline realocalizado para aba própria, preservando seu editor de regras e sessões ativos.
- Mundo: mapas, NPCs/spawns, recursos, setores, box e rotas com seus editores existentes.
- Universo: Portais Astrais, atalho para Universo e Warfront/Relés.
- Economia: lojas, preços, cupons, passe e serviços de economia.
- Eventos: calendário, WarBot, recompensas astrais.
- Segurança: logs, antifraude, administração de contas.
- Todas as chamadas de salvamento originais mantidas; nenhuma alteração de autenticação, endpoints ou regras de Farm/Universo.

## Atualizações anteriores inclusas
- V55 premium Hangar/Loja e artes aprovadas.
- V56 hangar triplo Nave/Drones/AUX, duas configurações compartilhadas e restauração das bases anteriores.

## Implantação
1. Partir da V54 (ou V55/V56), remover ZIPs antigos da raiz do GitHub.
2. Enviar só o ZIP acumulado V57 e executar Instalador Universal -> instalar.
3. Confirmar Actions, após deploy Render abrir ADM e testar abas, Farm e Universo.

**Sem migração SQL.** Nada apagado automaticamente. As funções administrativas e o servidor continuam exigindo credenciais ADM.
