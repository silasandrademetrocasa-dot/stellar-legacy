# Stellar Legacy V131 • sincronização de jogadores

## Atualizar o repositório online

1. Na branch main que contém a V130 online, envie STELLAR_V131_ATUALIZACAO.zip para a raiz. O instalador exige que seja o único ZIP nesse nível.
2. Em Actions, execute Stellar Legacy — Instalador Universal. Ele substitui os arquivos do patch, remove as instruções de instalação da V130 e valida o projeto antes de publicar o commit.
3. Após o commit do instalador, aguarde o deploy do Render. Para jogar no Android com os arquivos locais novos, compile e instale o APK pelo workflow APK LOCAL.
4. A migração sql/STELLAR_V131_SAVE_SYNC.sql deve estar instalada no Supabase antes do novo servidor. Ela já foi aplicada no projeto stellar-legacy identificado nesta entrega. Para outra instância com a base V118 instalada, execute esse SQL uma vez.

## Reconstruir a base completa

Extraia todas as partes STELLAR_V131_COMPLETO na mesma pasta. A raiz reconstruída contém package.json, public, server, sql, android e .github. As partes completas são para reconstrução manual. Para atualizar com o instalador, use o ZIP de atualização.

## Validar no jogo

Com a mesma conta, altere a montagem do hangar, interrompa a rede durante o salvamento e reconecte. Confira a montagem após reabrir o jogo. Faça uma venda de recursos e confira o saldo e o porão após novo login. Em um segundo aparelho, confirme que a substituição de sessão não aplica respostas atrasadas à conta aberta. Uma leitura oficial indisponível no login exibe uma mensagem e tenta novamente em dez segundos. Recompensas, compras e resgates continuam sujeitos às regras do servidor.
