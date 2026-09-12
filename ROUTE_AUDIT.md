# Auditoría de rutas · migración inicial FGDLL

Fecha del corte: 12 de septiembre de 2026.

| Ruta | Estado en `fgdll-web` | Fuente / observación |
|---|---|---|
| `/` | Migrada | Portada, orientación, zonas, agenda y accesos principales reconstruidos. |
| `/directorio` | Migrada | 119 grupos homologados y buscador local. |
| `/grupos/:slug` | Migrada | 119 fichas con URL única; nombres repetidos se distinguen por ciudad. |
| `/zonas/jaguar` | Migrada | 58 grupos. |
| `/zonas/tiburon` | Migrada | 35 grupos. |
| `/zonas/delfin` | Migrada | 11 grupos. |
| `/zonas/colibri` | Migrada | 7 grupos. |
| `/zonas/aguila` | Migrada | 8 grupos. |
| `/ayuda-adicciones-merida` | Migrada | Aclaración institucional y opciones de orientación. |
| `/necesito-orientacion` | Migrada | Contacto directo y aviso de emergencias. |
| `/centros` | Migrada | 28 centros recuperados de la fuente localizada. |
| `/centros/acceso` | Puente Sites | Login/edición/aprobación siguen dependiendo de ChatGPT Sites. |
| `/experiencias` | Migrada | 68 experiencias 2026 recuperadas. |
| `/escrituras` | Migrada | Alias institucional hacia experiencias/escrituras 2026. |
| `/noticias` | Migrada sin inventar contenido | El corte fuente no exponía un feed público separado. |
| `/agenda` | Migrada / conectable | Corte visible de septiembre; admite Google Calendar por variable de entorno. |
| `/universidad` | Migrada | Portada del sistema formativo. |
| `/universidad/dpl1-2026/index.html` | Respaldada | Portal y cuadernillos M1–M6 locales; se retiró el panel interno de edición de Sites. |
| `/universidad/dpl1-2022/index.html` | Respaldada / reconstruida | HTML, CSS y datos fuente recuperados; script de navegación/cuadernillo reconstruido localmente. |
| `/universidad/dpl1-2025/index.html` | Ficha preservada | El sitio fuente indicaba que faltaba cargar material oficial. |
| `/universidad/dpl2-2025/index.html` | Ficha preservada | El sitio fuente indicaba que faltaba cargar material oficial. |
| `/portal` | Puente Sites | El sitio publicado delega autenticación a OpenAI/Sites. |
| `/etica` | Puente Sites | El sitio publicado delega autenticación a OpenAI/Sites; fuente HTML histórica archivada. |
| `/administracion` | Puente Sites | Función privada. |
| `/administracion/universidad` | Puente Sites | Admisiones/gestión siguen en Sites. |
| `/envios` | Puente Sites | Mensajería privada existente. |
| `/mensajeria` | Alias a puente Sites | Alias amigable hacia `/envios`. |
| `/principios` | Migrada | Página institucional local. |
| `/nosotros` | Migrada | Alias de página institucional local. |

## Dependencias no exportables como código

El sitio público no expone los componentes internos de ChatGPT Sites que implementan autenticación, almacenamiento y acciones privadas. No se falsificaron ni se reemplazaron con Supabase u otro backend: quedaron encapsulados en `src/services/sites.ts`.

## Material preservado

`legacy/chunks/` (bundle Brotli en fragmentos Base64) conserva fuentes recuperadas de portada, scripts, experiencias, liderazgo, ética, centros, Universidad y estilos. La copia cruda del formulario de líderes **no se incluye**; sólo se conserva el directorio público saneado en `src/data/groups/`.
