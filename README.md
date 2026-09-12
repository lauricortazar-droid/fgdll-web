# Portal FGDLL

Repositorio maestro para conectar GitHub con el portal publicado en https://fgdll.org.

## Estado actual

- Portal publicado: https://fgdll.org
- ChatGPT Sites project: `appgprj_6a7ac128b0608191bb9000c3172d677a`
- Version publicada en Sites: 61
- Commit fuente publicado en Sites: `e8039931d506ab224acc822f74904edde45a3a01`
- Deploy Sites: `appgdep_6aa5bf333d9c81918ca3922871eace56`
- Dominio activo: `fgdll.org` y `www.fgdll.org`

## Fuente real del portal

La fuente completa del portal ya fue sincronizada localmente en:

`/Users/laucortazar/Documents/GitHub/fgdll-web-migracion`

Incluye la aplicacion Vinext/React, Worker, D1, R2, administracion, Universidad, reconocimientos, mensajeria, etica, directorio, centros, agenda, experiencias y testimonios.

## Datos actuales

- 119 grupos publicos
- 28 centros
- 32 eventos de agenda
- 67 experiencias/unidades
- 157 testimonios

## Pendiente para que GitHub sea fuente total

El push local esta bloqueado porque la maquina esta autenticada ante GitHub como `gdllteam-stack`, pero el repositorio pertenece a `lauricortazar-droid`. Hay que autenticar Git local como `lauricortazar-droid` o dar permiso de escritura a `gdllteam-stack`.

Cuando la credencial este corregida:

```bash
cd /Users/laucortazar/Documents/GitHub/fgdll-web-migracion
git push -u origin main
```

## Publicacion

- ChatGPT Sites es la produccion completa con D1/R2.
- Hostinger recibio un espejo estatico publico actualizado desde la misma version.
- GitHub queda conectado documentalmente con el portal y listo para recibir la fuente completa cuando se corrija la credencial local.
