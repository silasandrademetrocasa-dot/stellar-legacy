# Stellar Legacy V65 — Frota 2D Nova | web

Atualização VISUAL para aplicar sobre o Git V64 (package.json 47.7.20).
Modo do instalador: PATCH. Não é pacote Android.

### Instalação pelo GitHub (Instalador Universal)
1. Na aba Code, deixe exatamente UM ZIP na raiz do repositório.
2. Envie o arquivo `stellar-legacy-v65-web-sprites-2d.zip` na raiz e confirme o commit.
3. Em Actions, execute `🚀 Stellar Legacy — Instalador Universal`.
4. Aguarde todas as verificações da workflow (npm run check e npm test).
5. Depois de o Render concluir o deploy, atualize a página forçando reload (ou limpe cache do site caso necessário).

### O que muda
- 13 naves: `/assets/v65/ships/top/` para mapa, `/assets/v65/ships/front/` para loja/hangar/leilão.
- 11 sprites fornecidos de NPC separados e vinculados ao mapa + cards. Classes extras de NPC reutilizam essas 11 artes para preservar IDs antigos.
- 7 designs de drones: mesmo sprite para mapa e cards.
- AUX-9: 16 quadros superiores em atlas 4x4, animação local em movimento e preview.
- Todo sprite extraído tem margens transparentes; removidos pequenos fragmentos de sprites vizinhos.
- Nenhum GLB carregado no cliente; 125 arquivos .glb removidos; o antigo renderizador 3D e seletor 3D saíram.
- Econômia, atributos, saves, SQL, moedas, recompensas e autenticação do servidor preservados.

### Correspondência de arte
Os arquivos de origem NÃO tinham rótulos por sprite. A correspondência por ID seguiu a ordem visual de cada prancha (esquerda->direita, cima->baixo), com as duas pranchas das naves alinhadas por posição. Consulte `public/assets/v65/manifest.json` antes de publicar para confirmar a associação visual dos IDs desejados. Identidades sem sprite próprio reutilizam NPCs representativos, sem tocar nas regras do servidor.

### Controle de segurança
Este pacote é visual e inclui teste automático; o instalador exige baseVersion 47.7.20. Não contém SQL nem mudanças em rotinas de moeda. Se o Git já estiver em outra versão do package.json, NÃO force a instalação; adapte o patch contra o Git atualizado.

### Limitações dos testes
Validação estática e testes Node passam. Não substituem inspeção visual em um navegador real ou regressão online multiplayer.
