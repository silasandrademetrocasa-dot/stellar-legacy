# Stellar Legacy V19.0.17 — Rebalanceamento de evento

- **31 naves de evento** ajustadas por funcao: suporte, tanque, reconhecimento, controle e ataque. Naves comuns/Elite intactas.
- **4 escudos raros** corrigidos (AEG-3/4, VSH-0/6), preservando +6,25% regeneracao nos AEG.
- **4 equipamentos novos**: ARC-X (+4% contra alien), ARC-Ω (+6%), THR-7 (+14 velocidade) e Nanobot Prime (12k HP/18k escudo por segundo apos 5s sem dano).
- Novos equipamentos sao exclusivos de eventos: nao aparecem nas lojas nem no leilao. Podem ser distribuidos via editor ADM de recompensas de eventos/missoes/cupons depois do deploy.
- Habilidades existentes, economia (CR, STL, munição), NPCs, mapa e drops preservados.
- Balanceamento vem do Supabase, sincronizado a cada 45s. Codigo V19.0.17 acrescenta catalogo e sprites reutilizados temporariamente dos equipamentos Elite equivalentes.
- Para live: aplicar SQL somente se nao estiver aplicado, publicar ZIP na raiz Github, executar workflow; nao duplica migracao se ja aplicada.
- Atributos podem continuar sendo editados no ADM → BALANCEAMENTO.

## Confirmacao de producao
Migração publicada no Supabase com êxito (meta de balanceamento v10).
- 31 naves de evento, 4 escudos e 4 equipamentos novos confirmados; backup dos 35 atributos originais gravado no banco.
- 4 itens adicionados ao catálogo seguro de cupons; 0 itens adicionados à loja ou ao leilão.
- A edicao concorrente do modulo de porao comum (+3000) foi preservada.
- Os testes usam a V19.0.17 e a suite passou 112/112.
- Os novos equipamentos nao sao entregues automaticamente a jogadores; o ADM escolhe onde e quando distribuir.
- As artes dos novos equipamentos reutilizam sprites existentes temporariamente, sem alterar os arquivos originais.
