# Quoter

MicroSaaS de cotizaciones en español con React, TypeScript, Vite y Cloudflare Workers/D1. Incluye cuentas y negocios separados, catálogo, PDF con membrete, planes mensuales P2P, administración con MFA, historial, papelera y respaldos.

## Desarrollo local

Requiere **Node 24.14 o superior dentro de la versión 24**, npm y una instalación local de Chromium para las pruebas de navegador. Desde `quoter`:

```powershell
npm ci
if (!(Test-Path .dev.vars)) { Copy-Item .dev.vars.example .dev.vars }
npm run password:setup
npm run mfa:setup
npm run db:migrate
npm run dev
```

En Bash, crear `.dev.vars` solo si no existe: `test -e .dev.vars || cp .dev.vars.example .dev.vars`.

`EMAIL_MODE=preview` permite probar enlaces de cuenta localmente sin enviar correos ni requerir Turnstile. Se limita a loopback; no habilita ese bypass en una URL pública. Los generadores preservan las claves existentes y endurecen sus permisos POSIX. En Windows hay que restringir también sus ACL: [ADMIN_MFA.md](ADMIN_MFA.md). Nunca subir `.dev.vars`, `.env*`, `.qdb` ni copias SQL a Git.

La base local y la remota son independientes. El ID cero del archivo `wrangler.jsonc` es una plantilla; conservar el ID real en la configuración local de producción. No copiar datos demo a una D1 real sin revisar el destino.

## Verificación reproducible

```powershell
npx playwright install chromium
npm run verify
```

`verify` ejecuta unitarias, lint, tipos/compilación, integración y recuperación. El runner crea su propio servidor, configuración, claves ficticias y D1 temporal; destruye ese estado al terminar. No usa la base habitual ni envía correo real. La CI de `.github/workflows/verify.yml` repite estas comprobaciones en Linux y Windows con Node 24 y no requiere secretos Cloudflare.

Para repetir una suite aislada:

```powershell
npm run test:integration -- subscription-smoke subscription-browser
npm run test:integration -- backup-roundtrip-smoke editor-browser templates-smoke
```

Los comandos individuales `test:api`, `test:auth`, etc. siguen disponibles para desarrollo. Requieren un servidor local preview y los que manipulan SQL necesitan `QUOTER_IMPORT_STATE`; se recomienda el runner para que todas las conexiones usen el mismo destino. Las pruebas de cuentas rechazan destinos públicos antes de crear datos.

## Comportamiento relevante

- Cotizaciones: totales calculados por servidor, revisión obligatoria al editar y respuesta 409 cuando otra edición cambió el documento. El formulario conserva el borrador ante conflicto y permite recargar explícitamente.
- PDF: cuatro modelos (Clásica, Lateral, Minimalista y Corporativa), vista previa, membrete, logo, datos de empresa y condiciones de pago; **las notas internas no se exportan al PDF**. Los datos largos de empresa continúan fuera del membrete para mantener espacio útil.
- Borradores: advertencia antes de salir, volver, cambiar de negocio o cerrar sesión. No se guardan documentos privados en almacenamiento del navegador.
- Catálogo y clientes: búsqueda y carga por páginas. El catálogo conserva tarifas archivadas en las cotizaciones existentes.
- JSON: exportación formato 2 con imágenes compartidas deduplicadas; admite formato 1. La revisión valida logos por lotes y la restauración conserva identidades/fechas originales de registros nuevos. Límites: 8 MiB y 2000 registros por archivo. Las bases mayores requieren respaldo del operador.
- Planes: 25/15/1, 50/25/3 y 100/50/5 cotizaciones activas/partidas activas/plazas. Prueba inicial de siete días y solo lectura al vencer. Renovar el mismo nivel conserva el tiempo; ampliar es inmediato; bajar un plan pagado exige esperar a su vencimiento. El cobro y confirmación P2P siguen siendo manuales.
- Conservación: sin eliminación automática de cotizaciones, clientes, marcas o auditorías. El propietario puede revisar el volumen en Plan y uso y eliminar definitivamente una cotización de la papelera solo con confirmación de su número. Esta purga no se puede deshacer desde la aplicación.
- Administración: acceso maestro con correo verificado, contraseña y MFA; únicamente metadatos de otros negocios, IDs y planes, sin contenido privado.

## Publicación y actualización

Seguir [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md). Después de respaldar y revisar el destino:

```powershell
npx wrangler d1 migrations apply quoter-db --remote
npm run deploy
npm run check:production -- --url https://quoter.cotizandome.workers.dev
```

Aplicar las migraciones antes del código que las utiliza. El despliegue ejecuta unitarias, lint y compilación; la verificación integral se ejecuta mediante `npm run verify` y CI. La política de protección de ramas debe configurarse en GitHub para exigir la CI antes de fusionar; el archivo workflow por sí solo no activa esa regla externa.

El endpoint `/api/health` comprueba configuración y esquema vigente, sin datos privados. La entrega real de correo, MFA propio, reglas Cloudflare y pruebas públicas requieren validación del operador. El remitente de prueba de Resend solo permite la dirección propia autorizada; clientes necesitan un dominio de envío verificado.

No volver a generar `PASSWORD_PEPPER` ni `MFA_ENCRYPTION_KEY` al actualizar. `npm run password:provision` solo comprueba presencia; `--initialize` se permite exclusivamente cuando el secreto remoto no existe. Consultar [PASSWORD_SECURITY.md](PASSWORD_SECURITY.md).

## Operación y estado

- [OPERATIONS.md](OPERATIONS.md): respaldos cifrados, recuperación local, plan de reemplazo y mantenimiento.
- [ACCEPTANCE.md](ACCEPTANCE.md): aceptación pública y piloto.
- [ROADMAP.md](ROADMAP.md): alcance y pendientes externos.
- [REMEDIATION.md](REMEDIATION.md): correcciones de los 19 hallazgos y evidencia vigente.
- [AUDIT_2026-10-15.md](AUDIT_2026-10-15.md): fotografía histórica previa a estas correcciones; su matriz corresponde al commit auditado, no a los archivos reparados.

Los enlaces públicos de cotizaciones, WhatsApp, facturas y cobro automático siguen fuera del primer lanzamiento. No confundir un respaldo JSON por negocio con una recuperación completa de D1 y sus claves.

## Modelos de cotización

En **Mi negocio**, elige el modelo predeterminado y pulsa **Guardar marca**. La vista previa usa un cliente e importes de demostración sin guardar registros. Las nuevas cotizaciones usan la marca y el modelo actuales; también puedes seleccionar otro modelo en el formulario.

En el detalle de una cotización puedes cambiar solo su modelo y ver o descargar el PDF. Esa acción conserva el logo, los colores, los datos de empresa y los importes guardados. **Actualizar a la marca actual** reemplaza explícitamente la marca completa, incluido el modelo. Duplicar crea una cotización con la marca/modelo actuales del negocio. Las cotizaciones anteriores sin modelo guardado mantienen **Clásica**; la migración no reescribe sus snapshots.

La vista previa muestra el PDF generado y ofrece un enlace para abrirlo si el navegador móvil no integra visor. Los modelos respetan paginación, importes del servidor, condiciones de pago y exclusión de notas internas. Los respaldos JSON v1/v2 conservan la selección cuando existe y siguen aceptando archivos anteriores.

Esta versión requiere `0021_quote_templates.sql`. Actualiza la base local con `npm run db:migrate`; antes de desplegar aplica las pendientes en remoto con `npx wrangler d1 migrations apply quoter-db --remote`. Conserva la configuración real de D1 del equipo de despliegue.

## Documentación para lanzar y enseñar el producto

Paquete preparado el 19 de octubre de 2026: [estado de lanzamiento, marketing, costos y manuales por rol](docs/lanzamiento/README.md). Incluye [índice HTML con descargas PDF](docs/lanzamiento/entregables/index.html) y [calculadora de planificación sin conexión](docs/lanzamiento/entregables/calculadora-costos.html). Los precios son propuestas, no cobros configurados. Las tarifas de proveedores requieren confirmación; las políticas son borradores por aprobar. No se modifica la aplicación ni es necesario desplegar para leer este material.
