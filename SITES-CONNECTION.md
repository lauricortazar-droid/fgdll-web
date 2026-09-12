# Portal FGDLL

Repositorio de trabajo del sitio https://fgdll.org.
Proyecto Sites: appgprj_6a7ac128b0608191bb9000c3172d677a.

El codigo conserva la identificacion del proyecto original de Sites para referencia de migracion. Copiar o actualizar GitHub no publica automaticamente en Sites. La publicacion se realiza despues de sincronizar y validar los cambios. Los datos vivos, archivos privados y secretos permanecen fuera de Git.

Este repositorio usa `.openai/hosting.json` para que ChatGPT Sites pueda recibir el mismo build estatico que se genera para GitHub y Hostinger. Las dependencias privadas del proyecto original no se duplican en el frontend estatico.

Bindings heredados detectados en una configuracion anterior del proyecto original:

- D1: `DB`
- R2: `BUCKET`

Estos bindings no estan declarados en `.openai/hosting.json` porque los builds estaticos de Sites no pueden usar runtime bindings. Si se migra el backend completo, debe hacerse en una rama separada con worker, migraciones y almacenamiento versionados.
