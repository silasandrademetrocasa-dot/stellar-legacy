# Stellar Legacy V103 — Cumulativa + Loading MOBILE

Arte fornecida pelo próprio desenvolvedor (imagem 864 x 1536), convertida para WebP e instalada no lugar da imagem antiga em `public/assets/loading/stellar-battle-loading.webp`.

- **Versão de destino:** 47.7.59 (V103). A alteração visual não modifica o sistema econômico.
- **Cumulativa V85 → V103:** exige versão inicial 47.7.41. Inclui V90, APK Local, V91, Pacotes A+B+C, V101, V102 e proteções V103.
- **Cumulativa V90 → V103:** exige versão inicial 47.7.46.
- **Atualização V102 → V103:** exige versão inicial 47.7.58.
- **Somente arte na V103:** exige versão inicial 47.7.59 e mantém a mesma versão; o instalador aceita patch de mesmo número.

O logo inteiro é preservado com `background-size:contain`. Nas laterais da tela horizontal, um fundo de baixa opacidade usa a mesma arte, desfocado. Isso evita cortar a marca no APK quando o aparelho está na horizontal.

O ZIP NÃO inclui `.github`, pois o instalador protege esse diretório. O Android mantém os assets da pasta `public` dentro do APK e precisa ser recompilado depois do deploy para mostrar a nova arte na versão instalada.

**Observação importante:** o ZIP cumulativo verifica `baseVersion`; não instale o arquivo V85 → V103 sobre uma base V102 ou V103. Nesses casos use o ZIP específico. Banco, saldos e saves não são alterados.
