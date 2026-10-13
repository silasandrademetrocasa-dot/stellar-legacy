# Stellar Legacy V18.2.10 — AUX-9 compacto

## UX
- DESIGNS do AUX-9 e MODOS / EXTRAS do AUX-9 são dobráveis separadamente.
- Estado inicial: recolhido quando a preferência ainda não existe.
- Resumo: designer ativo, modo ativo e quantidade de módulos já comprados.
- Preferência salva em `stellar_hangar_equipment_ui_v1679`, propriedade `collapsed` nas chaves `aux:designers` e `aux:modes`.
- Cabeçalhos são botões acessíveis com `aria-expanded`; transição CSS em altura/opacidade e suporte a movimento reduzido.
- Funciona no Hangar e no modal AUX independente; não afeta a seleção de módulos, progressão, saves, recompensas ou banco.

## Instalação
Somente o ZIP V18.2.10; não há migração SQL.
