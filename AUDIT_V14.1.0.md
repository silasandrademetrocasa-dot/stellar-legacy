# Stellar Legacy V14.1.0 — Account Guard + Premium Auto-Combat

- Manual login obrigatório em cada entrada/reload.
- Sessão de autenticação não é persistida em localStorage.
- Save local/cloud vinculado ao `accountOwnerId`.
- Servidor rejeita save com owner diferente (`SAVE_OWNER_MISMATCH`).
- Callsign do save não possui autoridade para renomear perfil.
- Callsign explícito validado no servidor e protegido no banco contra duplicidade case-insensitive.
- AUTO-COMBATE exclusivo para PREMIUM ou PASSE MENSAL.
- SQL necessário: `sql/V14_1_ACCOUNT_GUARD.sql`.
