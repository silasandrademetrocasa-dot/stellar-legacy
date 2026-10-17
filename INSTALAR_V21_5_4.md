# Instalação — Navegação PvE e PvP equilibrada

SQL no Supabase: `sql/V21_5_4_EQUILIBRIO_MAPAS_PVE.sql` (a ser aplicado pelo assistente). **Não execute duas vezes manualmente** se já houver registro da migração.

1. Após a confirmação de SQL aplicado, publique o ZIP completo no GitHub pelo fluxo **Actions → Instalar versão do Stellar Legacy → Run workflow**.
2. Aguarde o Render publicar `/health` na versão `21.5.4`. Reinicie o Render se as salas mantiverem dimensões anteriores.
3. Teste X-1, X-4 e X-8 no mobile, com CONF de corrida e escudos. Confira câmera, portais, minimapa, NPCs, salvamento de posição e troca de mapas.
4. Confirme também 4-1 e os pontos A/B/C. **Conquistas não são zeradas.**

**Alcance**: X-1 a X-8 cresceram aproximadamente 20%, velocidades reduzidas a 88% do anterior somente na navegação destes mapas (proporção dos equipamentos preservada). A câmera que mantém a nave centralizada já funciona em PvE/PvP. Aurora/Nexus/Eclipse excluídos para preservar cronômetros e ondas. Todos os arquivos de SQL anteriores continuam no ZIP. O banco só é atualizado quando as dimensões antigas correspondem aos valores esperados; personalizações posteriores do ADM são preservadas.
