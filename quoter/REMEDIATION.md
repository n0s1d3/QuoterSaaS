# Reparaciones de la auditoría

Actualizado el **17 de octubre de 2026, America/Guatemala**. Este documento describe la reparación de los 19 hallazgos de `AUDIT_2026-10-15.md`; el informe y su CSV se conservan como evidencia histórica del commit que se auditó.

Los cambios se implementaron sin modificar la D1 publicada, enviar correos reales ni reemplazar claves de producción. Las comprobaciones usan cuentas ficticias, servidor local y D1 temporal. La publicación y comprobación final del servicio real se realizan desde el equipo del operador.

## Estado por hallazgo

| Hallazgo | Reparación implementada | Evidencia y límites |
| --- | --- | --- |
| F01 · Pepper | Provisión normal solo comprueba presencia; primera creación exige `--initialize`. Se rechaza un secreto remoto ya existente y un clon sin la copia privada no genera ni sube otra clave. | Pruebas con Wrangler simulado: reuso, clon nuevo, secreto existente y ausencia de inicialización explícita. La API no ofrece una creación condicional: usar un único operador para inicializar, no dos procesos concurrentes. |
| F02 · Respaldo JSON | Formato 2 con imágenes deduplicadas; importación compatible con formato 1. Logos validados por lotes con presupuestos de píxeles/inflado/bytes; token ligado a usuario, negocio, contenido, progreso y vencimiento. | Roundtrip real de 41 marcas históricas de 640 px y 25 cotizaciones que comparten un logo grande. Se mantienen 8 MiB y 2000 registros; no se quitan protecciones contra descompresión. |
| F03 · Edición obsoleta | PUT exige la revisión recibida por el editor, incluida la revisión 0 de registros históricos. Revisión antigua devuelve 409 sin mutar datos; el editor conserva el borrador y permite recargar con confirmación. | SQL real, carreras y prueba de navegador con dos ediciones. Las integraciones externas que hagan PUT deben enviar `revision` del GET. |
| F04 · Lecturas mezcladas | Cabecera, cliente e ítems se leen en una sola SELECT agregada. | Prueba que intercala una edición después de la lectura y comprueba instantánea coherente. |
| F05 · PDF | Membrete con altura máxima; datos completos extensos continúan en bloque paginable. | PDF con nombre/dirección de muchas líneas; se conservan datos y condiciones de pago. Las notas internas permanecen excluidas. |
| F06 · Borrador | Protección de navegación interna, Atrás, recarga, cambio de negocio y logout mediante confirmación. | Navegador: cancelar conserva el formulario. No se persisten documentos privados en el navegador. Un cierre forzado o pérdida del proceso aún puede perder un borrador que no se guardó. |
| F07 · Bloqueo por correo | Límites por IP y correo+IP; intentos distribuidos por correo escalan a Turnstile `quoter_login` en público, sin imponer bloqueo global por correo. | Contraseña correcta desde otra IP sigue funcionando tras intentos hostiles; se mantiene bloqueo de la IP atacante y prueba de challenge. |
| F08 · Limpiezas | Índices por vencimiento/uso y eliminación acotada a 100 filas por operación. | Planes SQLite y pruebas de conservación de credenciales activas y tamaño del lote. |
| F09 · Pruebas aisladas | Runner con configuración, puerto, claves y estado temporales; también operadores y SQL directo usan ese destino. Credenciales Cloudflare de infraestructura se excluyen de los procesos de prueba. | Las suites de suscripción HTTP/navegador antes omitidas entran en la verificación integral. El helper comprueba loopback y preview antes de crear cuentas. |
| F10 · CI | Workflow GitHub en Linux y Windows con Node 24, instalación reproducible, navegador y `npm run verify`. Deploy ejecuta unitarias, lint y build. | La CI no requiere secretos ni sube respaldos/artifacts privados. Exigir el check como protección de rama es una configuración externa pendiente del propietario de GitHub. |
| F11 · Cambios de plan | Se rechaza bajar capacidad mientras el plan pagado siga vigente; mismo nivel conserva tiempo y ampliación se aplica inmediatamente con aviso. Trigger D1 cubre también CLI/carreras. | Rechazo no consume referencia ni extiende tiempo; renovaciones y reintentos siguen siendo idempotentes. Se optó por rechazo explícito, no por un scheduler de planes futuros. |
| F12 · Permisos locales | Se endurecen archivos existentes a 0600 en POSIX y se rechazan symlinks, incluidos enlaces rotos. | Pruebas de archivo 0644 y enlaces. ACL de Windows documentadas y a cargo del operador; un administrador del sistema sigue siendo una entidad de confianza. |
| F13 · Recuperación | `recovery:plan` ensaya sin red y actualiza una copia del esquema; `recovery:apply` solo crea una D1 nueva, carga parámetros, invalida accesos restaurados y produce un binding para revisión. No cambia Worker ni claves. | API simulada con D1 real: respaldo 0017 actualizado a 0020 y logo de 400 KB conservado. La operación Cloudflare real y el RTO no se han medido. |
| F14 · Recordatorios | Consultas independientes y presentación intercalada de vencidas/próximas. | Combinaciones 4+1 y 4+4 no ocultan todos los próximos vencimientos. |
| F15 · Crecimiento | Exportaciones cuentan antes de materializar; CSV selecciona sus columnas; clientes/catálogo se buscan por páginas y las rutas de compatibilidad están acotadas. Catálogo se valida en conjunto e ítems se insertan en lote. | Pruebas de páginas, búsquedas literales/acentos, pertenencia y 100 partidas. Plan y uso muestra volumen bajo demanda. Purga explícita de papelera exige número exacto y revisión; sin eliminación automática de documentos o auditorías. |
| F16 · Conexiones | Timeout/cancelación, errores HTML controlados, estado HTTP y referencia de soporte; sin reintentos automáticos de escrituras. | Pruebas de HTML, JSON inválido, cancelación y timeout sin duplicar solicitudes. |
| F17 · Diagnóstico | `X-Request-ID` generado por servidor, correlacionado con respuesta 500 y log; se muestra una referencia segura de soporte. | Prueba sobre Worker compilado sin datos privados en el log. |
| F18 · Mantenimiento | Documentación de inicio actualizada, `es-GT`, títulos/foco por vista, acceso directo al contenido, páginas diferidas, ErrorBoundary e historial tolerante. Estilos consolidados y recursos muertos retirados. TypeScript `strict` habilitado y Node 24 declarado. | Tipos, lint, navegador y pruebas de historial malformado; la carga principal bajó aproximadamente de 327 KB a 233 KB antes de compresión. |
| F19 · Fechas | Fechas históricas validadas; creación/actualización originales se conservan en altas importadas. Una sobrescritura conserva creación y registra la actualización actual. | Pruebas de formato D1/ISO, rechazo de fechas inválidas y restauración completa. |

La purga definitiva es una acción deliberada del propietario, no una nueva tarea automática de retención. La auditoría se conserva; los datos archivados y el historial pueden seguir creciendo. Se añadieron paginación y métricas para observar y gestionar ese crecimiento. Fijar períodos legales de retención, cuotas físicas por contrato o una purga automática requiere una política comercial explícita y no se aplica silenciosamente.

## Dependencias

Actualizaciones compatibles incluidas:

- React y React DOM 19.3.1.
- AutoTable 5.0.9; jsPDF mantiene la versión compatible vigente.
- Cloudflare Vite plugin 1.64.0, Wrangler 4.151.1 y su Miniflare 5.20261012.1-beta, actualizados conjuntamente.
- Playwright 1.64.1 y oxlint 1.88.0.
- TypeScript se mantiene en la línea 6; no se cambia de major como reparación rutinaria. Se declara Node `>=24.14.0 <25`.

El lockfile forma parte de la actualización. No basta con copiar archivos nuevos manteniendo un `node_modules` antiguo: ejecutar `npm ci`. Los avisos de seguridad npm son una comprobación de vulnerabilidades conocidas, no una garantía de ausencia de defectos de la aplicación.

## Verificación

```powershell
npm ci
npx playwright install chromium
npm run verify
```

`verify` incluye unitarias, lint, compilación con tipos estrictos, suites API/navegador en estado temporal y recuperación D1. Las pruebas de recuperación revocan sesiones, tokens y códigos MFA presentes en la copia; el archivo cifrado original permanece intacto. Ninguna suite necesita credenciales de producción.

Evidencia del 17 de octubre de 2026: **83 pruebas unitarias, tipos estrictos, lint, build, 19 suites API/navegador y el ensayo de recuperación D1 aprobados** con las dependencias actualizadas. `npm audit` reporta cero avisos conocidos. La recuperación incluyó tokens de cuenta y códigos MFA reales de fixture, luego ausentes en la D1 nueva. Los resultados anteriores de la auditoría siguen referidos al commit auditado, no a esta versión. La CI fue añadida; su ejecución en GitHub y la plataforma Windows del propietario aún no se verifican desde este entorno.

## Actualización en Windows

Detener el servidor de desarrollo antes de reinstalar. Desde `C:\QuoterSaaS\quoter`:

```powershell
git pull origin main
npm ci
npm run db:migrate
```

Para publicar, conservar los IDs reales de Cloudflare y todas las claves existentes. Obtener primero un respaldo actual, ensayarlo y aplicar **las tres migraciones nuevas** antes del deploy:

```powershell
npm run backup:db -- --remote
npm run backup:drill -- --file ".backups/ARCHIVO-RECIEN-CREADO.qdb"
npx wrangler d1 migrations apply quoter-db --remote
npm run deploy
npm run check:production -- --url https://quoter.cotizandome.workers.dev
```

Migraciones nuevas: `0018_auth_cleanup.sql`, `0019_backup_validation.sql` y `0020_plan_schedule.sql`. La app actualizada requiere ese esquema. Un rollback de código puede convivir con las columnas/índices nuevos; no eliminar tablas ni deshacer migraciones manualmente para intentar volver atrás. Si hay un incidente, usar mantenimiento y el procedimiento de `OPERATIONS.md`.

No ejecutar `password:provision -- --initialize` para actualizar una instalación existente. No regenerar pepper, clave MFA o clave de respaldo. Las instalaciones nuevas deben seguir las instrucciones específicas de custodia/inicialización.

## Comprobaciones externas pendientes

- Aplicar migraciones y publicar desde el equipo con Wrangler autenticado; no se hizo desde este entorno.
- Aceptación pública con cuentas propias: Turnstile de login cuando corresponda, MFA, recuperación real, PDF, planes y JSON. Los cambios del widget no requieren otra site key si se utiliza la misma configuración de hostname.
- Configurar un monitor externo de `/api/health`, avisos de fallo, copia externa y periodicidad de respaldos; no se crearon cuentas de terceros ni se enviaron notificaciones desde herramientas.
- Exigir la CI en la protección de ramas de GitHub.
- Probar un reemplazo real en una D1 descartable, con custodia de secretos y conciliación; medir RPO/RTO antes de ofrecer un SLA.
- Habilitar dominio de envío verificado para clientes distintos de la cuenta propia autorizada por Resend; conservar correo de prueba no abre entrega general.

Estas tareas dependen de cuentas, credenciales o configuración fuera del repositorio. Se distinguen de los defectos de código reparados y no se presentan como ya ejecutadas.

## Modelos PDF y aislamiento del guardado (actualización posterior)

Se agregan cuatro modelos y la migración `0021_quote_templates.sql`. La selección predeterminada pertenece al negocio; la selección de cada documento se guarda en su snapshot de marca. Las cotizaciones antiguas conservan Clásica; no se reescriben automáticamente. Respaldos anteriores siguen siendo compatibles.

La prueba de conservación entre documentos detectó que las actualizaciones auxiliares de `payment_terms` y adicionales verificaban un token mediante `EXISTS` sin limitar la fila de destino. Se corrigieron con `id` y `organization_id` explícitos, también en la nueva selección de modelo. La regresión guarda varias cotizaciones de dos negocios y comprueba que solo cambia el documento solicitado. La reparación evita nuevas modificaciones ajenas; no puede reconstruir condiciones o adicionales alterados anteriormente sin una fuente histórica fiable. Si ya había documentos, comparar esos campos con sus copias originales o respaldos; no recalcular masivamente importes históricos.

Verificación de esta ampliación: **89 pruebas unitarias, tipos, lint, compilación, 20 suites de integración API/navegador y recuperación cifrada D1 aprobados**. Se verificaron las plantillas con 100 partidas, condiciones extensas, logo repetido por página, notas privadas ausentes, importes intactos, selección concurrente y persistencia JSON. La recuperación de un respaldo 0017 aplica también la migración 0021. La prueba de navegador incluye 375/768/1280 px y vista previa PDF sin violaciones de CSP detectadas. No se desplegó ni modificó producción.

## Periodos prepagados y análisis comercial (19 de octubre de 2026)

La migración `0022_billing_periods.sql` añade duración 1/3/6/12 a activaciones y tarifa calculada por servidor. Conserva fechas previas y deja importes históricos desconocidos en NULL. El calendario suma el intervalo una sola vez y ajusta fin de mes/año bisiesto. La referencia repetida exige mismo negocio, plan y periodo; el banco sigue verificándose externamente. Precios base GTQ49/89/149 y descuentos 0/5/10/15 % provienen de una fuente compartida; el cliente no fija la tarifa registrada. No cambia cupos ni siete días de prueba.

Evidencia: **94 unitarias, tipos/build/lint, 21 suites API/navegador y recuperación D1 aprobados**. Las suites se completaron en ejecuciones aisladas; se actualizó una expectativa de texto de «Plan mensual activo» a «Plan activo» para la nueva UI. Cuatro suites específicas también comprobaron activaciones, periodos, idempotencia, API/CLI y selección responsive. Los ensayos no modifican producción. Documentación: doce HTML, diez PDF y calculadora con escenarios, reserva de devolución, anticipos separados de ingreso equivalente mensual y costos por frecuencia de pago.

La política anterior de ampliación inmediata conservando tiempo se mantiene mientras se decide el crédito proporcional; se documenta el riesgo comercial con anualidades. No se implementa reembolso automático. El estudio de mercado usa documentación oficial de tres competidores fijada por commit; páginas de precios externas bloqueadas y tasas no publicadas están identificadas, sin presentar hipótesis como estadísticas observadas. Proveedores y régimen tributario siguen pendientes de verificación operativa.
