# Instalação — captura Warfront

1. **Banco:** não executar migração nova. O Supabase existente já contém os nove relés e as rotas de captura. `sql/V21_5_2_VERIFICACAO_CAPTURA.sql` é opcional e somente leitura. O SQL foi conferido diretamente no projeto `stellar-legacy`.
2. **Render:** confirme que a variável privada `SUPABASE_SERVICE_ROLE_KEY` permanece salva. Após uma mudança nela, execute o deploy/restart do serviço; não coloque o valor da chave no GitHub ou em capturas de tela.
3. **GitHub:** substitua o ZIP de instalação na raiz por este ZIP completo (sem extrair) e execute `Actions → Instalar versão do Stellar Legacy → Run workflow`.
4. **Teste:** entre em 4-1, vá até o centro do ponto A. Com nave viva e sem adversários, aguarde aproximadamente 18 s, mais o tempo de confirmação SQL. O painel deverá mostrar **CONFIRMANDO...** e depois **PONTO A CONQUISTADO**.
5. Atualize a página e confirme o mesmo proprietário. Entre com facção rival e capture até trocar de dono. Teste B/C e mapas 4-2/4-3.
6. **Se falhar:** abra o painel de Guerra e envie a mensagem **ERRO DE GRAVAÇÃO** ou o toast **PONTO A • ...** (sem chaves). Nos logs do Render, busque `[warfront-capture-failed]`, contendo mapa, relé e código; ele não imprime a chave.

Nota: ao confirmar mais de uma sala ao mesmo tempo, o banco tem revisão otimista para evitar capturas simultâneas indevidas. A nova versão não concede domínio enquanto a gravação não for aceita.
