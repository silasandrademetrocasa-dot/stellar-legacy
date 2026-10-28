# Stellar Legacy V54.0 — Relés Elite + Bases de Facção

Pacote cumulativo sobre o V53, sem SQL nem modificação de regras de combate.

## Atualização visual
- Relés em níveis I, II e III, com 4 paletas (neutro, Terra, Marte, Júpiter): 12 GLBs mobile e 12 sprites WebP editáveis/substituíveis.
- Efeitos Canvas animados: núcleo pulsante, anéis em rotação, escudo, disputa, captura e evolução; fogo dos relés continua derivado dos eventos do servidor.
- HP, escudo, níveis e domínio seguem dados sincronizados pelo servidor. Modelos nunca alteram esses valores.
- Bases: GLBs mobile Elite mais robustos em perspectiva com sprites WebP correspondentes; aumento só visual.
- Mantém Configurações > Visual do jogo (Automático/3D/2D), além de fallback sem WebGL2.

## Instalação
Coloque este ZIP na raiz do repositório (formato `stellar-install.json` já usado), execute o Instalador Universal e espere a validação do GitHub/Render. Não rodar SQL. Na primeira partida após o deploy, faça atualização forçada para renovar o cache.

## Atenção
Não houve validação de FPS em dispositivo físico neste ambiente. Teste um relé neutro, dominado e em combate nos mapas 4-X; depois revise os modos Automático/3D/2D no celular.

Não exclua os scripts de suporte e a lógica de relés do servidor; esta atualização é somente de apresentação.
