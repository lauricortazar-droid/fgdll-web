# FGDLL Web

Repositorio maestro del portal de la **Fraternidad Guerreros de la Luz (FGDLL)**. Este proyecto nació como una copia independiente del sitio publicado en `fgdll.org` dentro de ChatGPT Sites y está organizado para que, a partir de esta migración, **GitHub sea la fuente principal del código y del contenido versionado**.

> Regla operativa: los cambios permanentes del portal deben terminar en este repositorio. ChatGPT, una computadora local o un sistema de despliegue trabajan sobre la misma rama oficial (`main`).

## 1. Cómo funciona

El portal es una aplicación web estática escrita en TypeScript sin framework obligatorio. El proceso de compilación:

1. Compila `src/**/*.ts` a JavaScript ES modules dentro de `dist/js`.
2. Copia `src/styles` a `dist/styles`.
3. Copia todos los archivos de `public/` a `dist/`.
4. Genera `runtime-config.js` con las variables necesarias para los puentes a servicios externos.
5. Conserva las rutas públicas mediante un router del lado del cliente.

### Estructura

```text
/public
  /archive                fuentes históricas recuperadas
  /documents              documentos públicos/versionados
  /images                 logotipos e imágenes
  /universidad            portales HTML autónomos de Universidad
/src
  /components             componentes HTML reutilizables
  /data                   directorio, centros, agenda, experiencias
  /pages                  páginas del portal
  /services               integraciones, incluido ChatGPT Sites
  /styles                 identidad visual global
/scripts                   build, limpieza y servidor local
```

### Datos respaldados en la migración inicial

- Directorio público homologado: **119 grupos**.
- Cinco zonas: Jaguar, Tiburón, Delfín, Colibrí y Águila.
- Directorio recuperado de centros: **28 registros**.
- Calendario de experiencias 2026 recuperado: **68 registros**.
- Último corte de Agenda FGDLL recuperado para septiembre de 2026.
- Universidad DPL 2026: portada y cuadernillos interactivos M1–M6.
- Fuentes históricas recuperadas del portal, centros, Universidad, ética y scripts en `public/archive/`.

Los datos personales que no formaban parte del directorio público —fechas de nacimiento, domicilios particulares, información contractual y otros datos de expedientes de líderes/sublíderes— **no se exponen en el frontend ni se incluyen como archivo bruto en el repositorio**. el directorio versionado en `src/data/groups/` contiene únicamente el corte público saneado.

## 2. Cómo ejecutarlo localmente

Requisitos recomendados:

- Node.js 20 o superior.
- npm 10 o superior.

```bash
git clone <URL-DEL-REPOSITORIO>
cd fgdll-web
npm install
cp .env.example .env
npm run dev
```

Abre `http://127.0.0.1:4173`.

Comandos principales:

```bash
npm run check      # valida datos, IDs, rutas y materiales esenciales
npm run build      # genera /dist
npm run dev        # compila y sirve con fallback de rutas
npm run preview    # sirve una compilación ya generada
npm run clean      # elimina /dist
```

## 3. Cómo hacer cambios

### Contenido público

- Grupos: `src/data/groups.ts` + `src/data/groups/` (cortes editables por zona)
- Centros: `src/data/centers.ts`
- Experiencias: `src/data/experiences.ts` + `src/data/experiences/`
- Agenda: `src/data/agenda.ts`
- Páginas: `src/pages/pages.ts`
- Navegación y pie: `src/components/layout.ts`
- Diseño: `src/styles/main.css`

Después de cualquier cambio:

```bash
npm run check
npm run build
```

Para trabajo con ramas:

```bash
git checkout -b cambio/descripcion
git add .
git commit -m "Descripción del cambio"
git push -u origin cambio/descripcion
```

Una vez revisado, integrar a `main`.

## 4. Cómo publicar nuevas versiones

`main` debe representar la versión oficial aprobada. El flujo recomendado es:

```text
ChatGPT o PC → rama de cambio → validación → main → despliegue
```

No se recomienda hacer cambios permanentes directamente en un proveedor de hosting si esos cambios no regresan al repositorio.

## 5. Servicios externos utilizados

El núcleo público puede compilarse y ejecutarse sin un backend propio. Algunas funciones usan o enlazan servicios externos:

- **ChatGPT Sites / OpenAI**: autenticación y funciones privadas que aún permanecen en el proyecto original.
- **WhatsApp**: enlaces de orientación y contacto.
- **YouTube**: videos de Universidad.
- **Jotform / formularios externos**: algunos recursos históricos de Universidad.
- **Google Calendar**: opcional para mostrar una agenda conectada.
- **Google Fonts/CDN**: algunos HTML históricos de Universidad aún pueden solicitar fuentes o recursos externos.

## 6. Variables de entorno

Consulta `.env.example`.

### `SITES_ORIGIN`

Origen del proyecto de ChatGPT Sites que conserva las funciones privadas durante la transición.

```env
SITES_ORIGIN=https://fgdll.org
```

Mientras `fgdll.org` siga apuntando al proyecto actual de Sites, este valor conserva la conexión existente. **Antes de mover el dominio principal a otro hosting**, cambia `SITES_ORIGIN` al dominio directo del proyecto de ChatGPT Sites (por ejemplo el hostname `*.chatgpt.site` correspondiente) para evitar un bucle de redirección.

### `GOOGLE_CALENDAR_EMBED_URL`

Opcional. URL de inserción del calendario público autorizado.

```env
GOOGLE_CALENDAR_EMBED_URL=
```

No guardes tokens, contraseñas, claves API ni secretos en Git. `.env` está ignorado deliberadamente.

## 7. Funciones que todavía dependen de OpenAI / ChatGPT Sites

En la migración inicial, estas rutas se conservaron como **puentes explícitos** hacia el proyecto original:

- `/portal`
- `/etica`
- `/administracion`
- `/administracion/universidad`
- `/centros/acceso`
- `/envios` y `/mensajeria`

La razón es que el sitio publicado delega hoy su autenticación y/o acciones privadas a infraestructura de ChatGPT Sites/OpenAI. El adaptador está en `src/services/sites.ts`.

Esto permite que el frontend y el contenido público vivan en GitHub sin inventar un backend distinto ni sustituir ChatGPT Sites por Supabase u otro proveedor.

## 8. Despliegue

### Hostinger

1. Ejecuta `npm install && npm run build`.
2. Sube **el contenido de `dist/`** al directorio web (`public_html` o el directorio configurado).
3. Conserva `dist/.htaccess`; contiene el fallback de rutas para Apache.
4. Configura las variables antes de construir si necesitas un origen de Sites distinto.
5. Prueba rutas profundas como `/centros`, `/universidad` y `/grupos/...`.

Para automatizarlo, puede usarse GitHub Actions o la integración Git disponible en el plan de hosting.

### Netlify

El repositorio incluye `netlify.toml`.

- Build command: `npm run build`
- Publish directory: `dist`

Netlify aplicará el fallback SPA incluido.

### Vercel

El repositorio incluye `vercel.json`.

- Build command: `npm run build`
- Output: `dist`

Configura `SITES_ORIGIN` y cualquier variable opcional en Project Settings → Environment Variables.

## Rutas respaldadas

Consulta [`ROUTE_AUDIT.md`](ROUTE_AUDIT.md) para ver la matriz de rutas, el estado de migración y las dependencias que todavía requieren ChatGPT Sites.

## Archivos históricos

Los HTML/CSS/JS heredados recuperados se conservan sin pérdida dentro de `legacy/chunks/` (bundle Brotli en fragmentos Base64). El archivo `legacy/manifest.json` enumera su contenido y `npm run build` los reconstruye automáticamente dentro de `dist/` en sus rutas originales. `public/archive/README.md` documenta este mecanismo.

## Seguridad

Aunque el repositorio sea privado:

- no versionar `.env`;
- no subir contraseñas ni tokens;
- separar información pública de expedientes internos;
- revisar datos personales antes de publicar una rama o despliegue;
- usar variables de entorno o un gestor de secretos para credenciales futuras.

## Fuente maestra

Desde esta migración, la arquitectura objetivo es:

```text
PC ─────────┐
            ├── GitHub · fgdll-web · main ──→ Hosting / publicación
ChatGPT ────┘                 │
                              └──→ ChatGPT Sites (sólo servicios todavía dependientes)
```

Así existe una sola historia de cambios y una copia completa recuperable desde GitHub.
