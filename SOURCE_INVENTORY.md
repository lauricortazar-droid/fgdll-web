# Inventario de fuentes recuperadas

Corte: 12 de septiembre de 2026.

Este archivo documenta qué material del proyecto FGDLL pudo recuperarse como código/datos y qué funciones permanecen enlazadas al proyecto original de ChatGPT Sites.

## Recuperado y versionado

- Portada pública, navegación y estilos institucionales reconstruidos.
- Directorio público homologado: 119 grupos, cinco zonas y 119 rutas únicas.
- Centros: 28 registros recuperados de la fuente del portal.
- Experiencias/escrituras 2026: 68 registros.
- Agenda: corte visible de septiembre de 2026 y soporte para Calendar mediante configuración.
- Universidad DPL1-2026: portada y cuadernillos M1–M6.
- Universidad DPL1-2022: HTML, CSS y datos fuente; navegación/cuadernillo local reconstruidos.
- DPL1-2025 y DPL2-2025: se conserva el estado “pendiente de material oficial” que mostraba la fuente; no se inventan módulos.
- Fuentes históricas de portada, portal, ética, centros, Universidad, experiencias, estilos y scripts bajo `legacy/chunks/` (bundle Brotli en fragmentos Base64).
- Escudo institucional en `public/images/`.

## Datos excluidos intencionalmente

No se versiona la copia bruta del formulario de líderes/sublíderes. Contenía campos personales y operativos que no forman parte del directorio público (fechas de nacimiento, domicilios particulares, estigmas, ocupaciones, contratos, rentas y otros datos de expediente). El archivo `public/archive/directory-homologated-public.json` contiene únicamente la versión saneada destinada al portal.

No se versionan contraseñas, cookies, tokens, claves API ni secretos. `.env` está ignorado.

## Funciones que siguen en ChatGPT Sites

El sitio público no permite exportar como archivos los servicios privados internos de Sites/OpenAI. Se conservaron como puentes configurables mediante `SITES_ORIGIN`:

- `/portal`
- `/etica`
- `/administracion`
- `/administracion/universidad`
- `/centros/acceso`
- `/envios`
- `/mensajeria`

No se sustituyeron por Supabase ni por otro backend.

## Regla desde esta migración

`lauricortazar-droid/fgdll-web` en la rama `main` es la fuente maestra del código versionado. Cualquier cambio futuro debe quedar registrado allí para que PC, ChatGPT y el despliegue trabajen sobre la misma versión.
