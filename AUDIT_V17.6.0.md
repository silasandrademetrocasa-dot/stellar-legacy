# AUDIT V17.6.0 — ENVIRONMENT REVAMP

## Escopo
- Cenário e iluminação apenas.
- Sprites de NAVE, NPC, AUX-9 e DRONES preservados.
- Backgrounds em WebP ~1600x900 com carregamento pelo pipeline de qualidade.
- Efeitos ambientais dinâmicos só no perfil alto; médio reduz e baixo usa fallback leve.
- Portais com identidade visual por destino.
- Base orbital com asset otimizado e safe-zone mais discreta.

## Performance
- Cenário continua sendo o primeiro elemento a sofrer redução no modo AUTO/MÉDIA/BAIXA.
- Entidades continuam protegidas pelo Entity Graphics Lock da V17.5.2.
