# Stellar Legacy — hotfix de validação do APK

**Base e destino:** `47.7.46` (V90). Não altera versão nem jogo em produção.

O screenshot do Actions confirma **135/136 testes**, mas não mostra o nome do teste falhado; portanto, a causa exata não está confirmada.

## Correção

Um teste de APK exigia rigidamente `.github/workflows/Instalapk.yml`.
Se o workflow modernizado tivesse sido instalado com outro nome, o teste falharia embora o build Android estivesse correto.
Agora o teste procura qualquer arquivo `.yml` / `.yaml` dentro de `.github/workflows` que:
- prepara o inventário local (`prepare-apk-assets.js`),
- verifica os recursos (`verify-apk.js`),
- executa `assembleDebug`.

E continua conferindo a existência dos scripts reais e do AndroidManifest.

## Se o Actions continuar falhando

1. Abra o passo **Testar WEB e inventariar TODAS as artes do APK**.
2. Use **Search logs** para localizar `not ok` ou `failureType` e abra o trecho de erro, **antes** das linhas finais `# pass` / `# fail`.
3. Envie o nome do teste e as linhas de `error:`. Essa evidência é necessária para diagnosticar outros tipos de falha, porque o screenshot apenas mostra a contagem.

## Limites

Não há alteração de combate, saves, sprites ou rede. O APK compilado só será validado após o workflow passar pelo Gradle e publicar o artifact.
