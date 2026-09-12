# Portal unificado FGDLL

Este repositorio contiene la fuente real del portal publicado en `fgdll.org`.

La regla operativa es:

1. GitHub conserva el codigo fuente, el historial y las revisiones.
2. ChatGPT Sites publica la aplicacion completa con Worker, D1 y R2.
3. Hostinger puede recibir la aplicacion JavaScript desde el mismo archivo fuente, pero las funciones que dependen de D1/R2 deben validarse ahi despues del build.

## Fuente actual

- Proyecto Sites: `appgprj_6a7ac128b0608191bb9000c3172d677a`
- Version base sincronizada: `b3dcddc Actualizar agenda vigente al 12 de septiembre`
- Dominio activo en Sites: `https://fgdll.org`

## Datos incluidos

El corte actual contiene:

- 119 grupos publicos en `app/public-directory-data.json`
- 28 centros publicados en `app/public-centers-data.json`
- 32 eventos de agenda en `app/calendar-data.json`
- 67 experiencias/unidades en `app/monthly-experiences-data.json`
- 157 testimonios en `app/testimonios-data.json`

Los registros privados y administrativos siguen en D1 y no deben exportarse al frontend estatico ni a archivos publicos sin revision.

## Publicacion

Para Sites, publicar desde la rama `main` del repositorio fuente vinculado al proyecto y guardar/desplegar una version.

Para Hostinger, usar el paquete de fuente sin `node_modules`, sin `dist`, sin `.next`, sin `.wrangler` y sin `.sites-runtime`. Hostinger debe ejecutar el build de Node.js.

Si Hostinger no provee bindings equivalentes a D1/R2, sus rutas privadas pueden no funcionar alli. En ese caso Hostinger sirve como respaldo/copia de la aplicacion y Sites queda como produccion completa.
