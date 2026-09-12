# Conexion ChatGPT Sites

El portal FGDLL publicado en `https://fgdll.org` esta vinculado al proyecto:

```text
appgprj_6a7ac128b0608191bb9000c3172d677a
```

## Produccion actual

- Version Sites: 61
- Commit fuente Sites: `e8039931d506ab224acc822f74904edde45a3a01`
- Deploy: `appgdep_6aa5bf333d9c81918ca3922871eace56`
- URL Sites: `https://portal-fgdll.pepecortazar.chatgpt.site`
- URL publica principal: `https://fgdll.org`

## Bindings requeridos

La aplicacion completa usa ChatGPT Sites con Cloudflare Worker:

- D1 binding: `DB`
- R2 binding: `BUCKET`

Estos bindings son necesarios para administracion, solicitudes, mensajeria, reconocimientos, etica, Universidad y otros flujos privados.

## Secretos

Variables secretas detectadas en Sites:

- `FGDLL_ADMIN_EMAILS`
- `FGDLL_LEADER_EMAILS`
- `FGDLL_NOTIFICATION_EMAIL`

No se deben copiar secretos a GitHub ni a archivos `.env` versionados.

## GitHub

Este repositorio esta conectado al portal como registro maestro externo. La fuente completa esta preparada localmente, pero el push completo requiere autenticar Git local como `lauricortazar-droid` o conceder escritura a `gdllteam-stack`.
