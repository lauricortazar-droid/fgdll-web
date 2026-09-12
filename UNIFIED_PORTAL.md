# Portal unificado FGDLL

Este repositorio es la fuente unica del portal FGDLL para tres destinos:

- GitHub: conserva el codigo, historial, revisiones y respaldos.
- ChatGPT Sites: publica el mismo build estatico mediante `.openai/hosting.json`.
- Hostinger: recibe el ZIP generado desde `dist/`.

## Regla principal

Todo cambio permanente debe entrar primero al repositorio y pasar por el mismo build:

```bash
npm install
npm run check
npm run build
```

El resultado oficial siempre es `dist/`. No se editan archivos directamente en Hostinger ni en ChatGPT Sites si ese cambio no regresa a GitHub.

## ChatGPT Sites

La copia local queda vinculada al proyecto Sites existente:

```text
appgprj_6a7ac128b0608191bb9000c3172d677a
```

El archivo `.openai/hosting.json` declara un sitio estatico con `dist/` como salida. El proyecto Sites actual tambien conserva funciones privadas, variables secretas y datos vivos que no forman parte del build estatico de esta copia.

Variables secretas detectadas en Sites:

- `FGDLL_ADMIN_EMAILS`
- `FGDLL_LEADER_EMAILS`
- `FGDLL_NOTIFICATION_EMAIL`

Dominios activos en Sites:

- `fgdll.org`
- `www.fgdll.org`

## GitHub

GitHub debe contener el codigo fuente, la documentacion, los datos publicos saneados, configuraciones de despliegue y el historial. El repositorio remoto esperado es:

```text
https://github.com/lauricortazar-droid/fgdll-web
```

Cuando Git local tenga credenciales, publicar:

```bash
git push -u origin main
```

## Hostinger

Hostinger debe recibir solo el ZIP generado desde `dist/`, no el proyecto fuente completo. Para preparar el paquete:

```bash
npm run package:release
```

El archivo `release/fgdll-web-hostinger-dist_*.zip` se puede subir a `public_html` o al directorio configurado en Hostinger.

## Paquetes de salida

`npm run package:release` genera tres artefactos desde el mismo commit:

- `fgdll-web-source_*.zip`: respaldo del codigo fuente.
- `fgdll-web-hostinger-dist_*.zip`: archivos estaticos listos para Hostinger.
- `fgdll-web-chatgpt-sites_*.tar.gz`: paquete compatible con ChatGPT Sites.

Los tres paquetes provienen del mismo `HEAD`, por lo que GitHub, Sites y Hostinger pueden quedar sincronizados.

## Dependencias que no se duplican

Las funciones privadas del proyecto original de Sites no se copian como frontend estatico ni se inventan en Hostinger. Las rutas privadas del portal siguen usando puentes explicitos desde `src/services/sites.ts` hacia `SITES_ORIGIN`.

Si en el futuro se reemplazan esas funciones por un backend propio, debe hacerse como una migracion separada y versionada.
