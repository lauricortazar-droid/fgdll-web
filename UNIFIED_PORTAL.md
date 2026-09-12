# Portal unificado FGDLL

Este repositorio conecta GitHub con el portal publicado en `fgdll.org`.

## Arquitectura actual

- GitHub: registro maestro externo y destino para la fuente completa.
- ChatGPT Sites: produccion completa del portal con Worker, D1 y R2.
- Hostinger: espejo publico estatico actualizado desde la misma version.

## Version activa

- Proyecto Sites: `appgprj_6a7ac128b0608191bb9000c3172d677a`
- Version Sites: 61
- Commit fuente Sites: `e8039931d506ab224acc822f74904edde45a3a01`
- Produccion: `https://fgdll.org`

## Datos sincronizados

- 119 grupos publicos
- 28 centros
- 32 eventos de agenda
- 67 experiencias/unidades
- 157 testimonios

## Fuente local completa

La fuente real del portal esta en:

`/Users/laucortazar/Documents/GitHub/fgdll-web-migracion`

El commit local que contiene la fuente completa es:

`044748c Sincronizar fuente real del portal FGDLL`

## Bloqueo actual

Git local no puede empujar a `lauricortazar-droid/fgdll-web` porque esta autenticado como `gdllteam-stack`, y GitHub rechazo el push con 403.

Opciones para completar el vinculo total:

1. Autenticar Git local como `lauricortazar-droid`.
2. Dar permiso de escritura a `gdllteam-stack` en `lauricortazar-droid/fgdll-web`.
3. Usar una credencial PAT de `lauricortazar-droid` con permisos de repo.

Despues ejecutar:

```bash
cd /Users/laucortazar/Documents/GitHub/fgdll-web-migracion
git push -u origin main
```
