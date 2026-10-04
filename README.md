# Stellar Legacy V13.4.1 — STELLAR IDENTITY

Atualização de interface aplicada sobre a base V13.1.0 WARFRONT, preservando as mecânicas e o backend existentes.

## Principais mudanças
- HUD JOGADOR em bloco próprio, independente de NAVE e AUX-9 e controlável em Configurações > HUD.
- OVERDRIVE e KAMIKAZE movidos para a barra inferior junto das munições.
- AUX-9 com módulos estritamente exclusivos por função: combate, BOX, mineração ou reparo.
- Efeitos sonoros para laser, míssil, impactos, explosões, habilidades e Nova Burst.
- Login compacto em desktop/mobile, com recuperação de senha e sem rolagem do modal.
- Perfil de Piloto atualiza imediatamente após compra de Núcleos Quânticos, conversão de PP e evolução.
- Stellar Auto Installer incluído em `.github/workflows/stellar-auto-installer.yml`.
- Interface limpa de textos de teste/bastidor.
- Compatível com os saves e o backend atuais.

## Instalação
1. Suba os arquivos desta pasta no Git/Render.
2. Execute `sql/V13_3_STELLAR_IDENTITY.sql` se estiver instalando esta versão em outro banco; no projeto principal o ajuste de identidade já foi aplicado.
3. Confirme `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no Render.
4. Faça o deploy/restart do serviço.

## Controles preservados
- `CTRL`: laser
- `ESPAÇO`: míssil
- `E`: habilidade da nave
- `K`: Nova Burst do AUX-9
- `W`: WARFRONT
