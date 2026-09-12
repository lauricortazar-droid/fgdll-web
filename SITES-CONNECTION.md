# Conexion ChatGPT Sites

El portal FGDLL publicado en `https://fgdll.org` esta vinculado al proyecto:

```text
appgprj_6a7ac128b0608191bb9000c3172d677a
```

La configuracion local en `.openai/hosting.json` declara:

- D1 binding: `DB`
- R2 binding: `BUCKET`

Estos bindings son necesarios para administracion, solicitudes, mensajeria, reconocimientos, etica, Universidad y otros flujos privados.

Variables secretas detectadas en Sites:

- `FGDLL_ADMIN_EMAILS`
- `FGDLL_LEADER_EMAILS`
- `FGDLL_NOTIFICATION_EMAIL`

No se deben copiar secretos a GitHub ni a archivos `.env` versionados.
