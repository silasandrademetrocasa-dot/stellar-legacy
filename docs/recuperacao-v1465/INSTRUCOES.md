# Recuperação V146.5 em duas partes

Pacotes UPDATE para o ZIP enviado em 18/11/2026 (versão 47.8.5). Não são uma reconstrução completa do jogo. Todas as artes e caminhos corretos continuam no projeto.

1. Guarde o ZIP original como backup fora do repositório.
2. Deixe apenas Stellar_V146_5_PARTE_1_LIMPEZA.zip na raiz, sem extrair. Execute Stellar Legacy — Instalador Universal e aguarde sucesso.
3. Só então coloque Stellar_V146_5_PARTE_2_REPARO.zip na raiz e execute o mesmo workflow. Não envie as duas partes juntas: o workflow aceita exatamente um ZIP por execução.
4. A instalação mantém 47.8.5. Sem SQL novo. A validação autenticada de gameplay ainda depende de teste após publicação.

A limpeza apaga somente 2.727 cópias de dependências na raiz, comprovadas byte a byte contra node_modules do ZIP anterior, e os arquivos gerados enumerados em LIMPEZA.json. Não apaga pastas inteiras nem usa curingas. O Git não mantém diretórios vazios. O npm reinstala dependências no local correto via package-lock.json; o pretest existente executa npm ci quando necessário.

O reparo reaplica a correção de save V146.5 preservando suas alterações de conexão, manifesto Android, workflows, instalador, recursos gráficos, SQL e demais arquivos. Não há alteração do banco ou deploy nesta preparação. O workflow, quando executado por você no GitHub, valida e faz commit/push; pode acionar o deploy já configurado no repositório.

Reversão: restaure o commit anterior pelo Git ou recupere os arquivos a partir do ZIP original. Não limpe os dados locais do jogador nem filas pendentes.
