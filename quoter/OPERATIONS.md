# Operación y recuperación

Preparado el 15 de octubre de 2026. Estas herramientas no configuran por sí solas un servicio de monitoreo ni respaldos programados. El operador confirmó un respaldo publicado y su ensayo local el 15 de octubre de 2026. Este entorno no ha ejecutado una recuperación remota ni cambiado bindings de producción.

## Comprobación pública

Después de actualizar el código y desplegar desde la instalación con Wrangler autenticado:

```powershell
npm run deploy
npm run check:production -- --url https://quoter.cotizandome.workers.dev
```

La comprobación solo realiza GET sin credenciales: página/encabezados, disponibilidad D1 y configuración mínima, Turnstile, preview de correo desactivado y rechazo de acceso anónimo. No crea cuentas ni envía correos. Un resultado correcto no prueba que las claves externas sean válidas o que el remitente pueda entregar a cualquier destinatario.

`GET /api/health` devuelve exclusivamente `{"status":"ok"}` (200) o `{"status":"unavailable"}` (503). Comprueba conexión D1, migración 0021, cuatro triggers de seguridad y presencia/formato de configuración necesaria; no consulta clientes ni cotizaciones. Configurar un monitor HTTPS cada cinco minutos y alertar tras dos fallos consecutivos es el siguiente paso del operador; todavía no hay alertas externas configuradas. Conservar únicamente categorías de error y requestId en registros, nunca cuerpos, tokens ni respaldos.

## Respaldo completo D1, exclusivo del operador

El JSON de un negocio permite recuperar su contenido. La D1 completa contiene información privada de TODOS los negocios, cuentas, sesiones y factores cifrados: no se incorpora al panel maestro ni se comparte con clientes.

Desde `quoter`, con Node 24 y la configuración local apuntando a la D1 correcta:

```powershell
npm run backup:key
npm run backup:db -- --remote
npm run backup:drill -- --file ".backups/ARCHIVO-MOSTRADO-POR-EL-COMANDO.qdb"
```

`backup:key` genera una clave aleatoria de 256 bits en `.env.d1-backup-key.local`; conserva la existente y aplica 0600 también a archivos regulares existentes en POSIX; rechaza enlaces simbólicos. Guardarla en un gestor seguro, separada de los archivos `.qdb`. No mostrarla en chat ni en Git. En Windows, restringir también los permisos NTFS del directorio al operador: el modo POSIX 0600 no reemplaza sus ACL.

`backup:db` exige `--remote`, exporta sin modificar la D1 y guarda un archivo AES-256-GCM autenticado en `.backups/`. Cada archivo tiene nombre único. SQL temporal y logs de Wrangler se eliminan al terminar; un cierre forzado puede dejar un directorio `quoter-recovery-*` en los temporales del sistema, que debe custodiarse y eliminarse. Se admite hasta 128 MiB de SQL por archivo; para bases mayores utilizar el procedimiento nativo D1. Un error no deja un respaldo final presentado como válido.

`backup:drill` autentica el archivo antes de importar, utiliza siempre un estado D1 local temporal nuevo y verifica integridad, claves foráneas y esquema de seguridad. Rechaza `--remote` y elimina ese estado al terminar. No sustituye la base de producción ni el entorno habitual de desarrollo. Solo ejecutar respaldos confiables creados por el operador.

El ensayo utiliza su propia configuración temporal, sin reutilizar bindings, assets ni configuración generada por el despliegue. La salida por sentencia se guarda en un archivo temporal privado para evitar que un respaldo grande agote el buffer del proceso. Wrangler también escribe sus errores JSON en esa salida; si falla, solo se leen segmentos acotados para clasificarlos, y el archivo se elimina junto al resto del estado temporal. El diagnóstico muestra únicamente etapa (`import`, `verify` o `export`), categoría y código de salida; compartir esos campos permite continuar el diagnóstico sin enviar SQL, `.qdb` ni claves. Las categorías distinguen problemas de referencias, sintaxis/esquema, SQL restringido/transacciones/límites, runtime local, permisos, espacio y límite de salida. Un error de importación después del descifrado no demuestra que el archivo cifrado esté corrupto. No volver a generar la clave para intentar corregirlo.

Un logo o membrete grande puede exceder el límite de longitud de sentencias de D1 al aparecer como literal en un `INSERT` exportado. Ante `sql_limit`, el ensayo reintenta automáticamente en otra base temporal: interpreta el SQL confiable con SQLite local y carga las filas en D1 local con parámetros, sin recortar logos, notas ni membretes. Conserva tablas, índices, triggers y secuencias; verifica referencias y cantidades de filas. Los triggers se instalan después de los datos para evitar repetir sus efectos. El estado temporal inicial nunca se reutiliza tras el fallo. La verificación final sigue ejecutándose contra D1 con Wrangler. Este camino requiere `npm ci` después de actualizar las dependencias y solo admite el esquema de Quoter con dependencias de tablas sin ciclos; ante datos inválidos o enteros fuera del rango seguro, falla sin aprobar el ensayo. No modifica el respaldo cifrado original.

Los respaldos no incluyen los secretos del Worker. Custodiar por separado **PASSWORD_PEPPER**, **MFA_ENCRYPTION_KEY**, clave del respaldo, configuración de bindings y procedimiento para renovar las claves Resend/Turnstile. Recuperar la D1 sin pepper o clave MFA puede impedir el acceso a cuentas existentes. `.gitignore` excluye estas claves y los respaldos; no adjuntarlos a incidencias ni artifacts de CI.

Propuesta inicial: respaldo diario y antes de migraciones, copia cifrada fuera del equipo, retención de siete diarios y cuatro semanales, ensayo mensual. Objetivos iniciales RPO 24 horas y RTO 2 horas; son objetivos por validar, no un SLA medido. No se ha automatizado esa periodicidad ni contratado almacenamiento externo.

## Permisos y custodia local

Los generadores de pepper, MFA y clave de respaldo endurecen archivos existentes a 0600 en POSIX; no basta con el modo de creación. No ejecutarlos mediante enlaces simbólicos. Conservar las claves en un gestor del operador y los `.qdb` en otra ubicación cifrada. El panel maestro no recibe estos archivos.

Windows usa ACL NTFS, no permisos POSIX. Desde PowerShell, para cada archivo privado existente (`.dev.vars`, `.env.password-pepper.production.local`, `.env.d1-backup-key.local`):

```powershell
$operator = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$secret = ".dev.vars"
icacls $secret /inheritance:r
icacls $secret /grant:r "${operator}:(F)"
icacls $secret
```

Revisar la última salida y retirar permisos explícitos de otros usuarios/grupos si existían; `/inheritance:r` elimina los heredados pero no borra concesiones explícitas previas. Aplicar la misma política al directorio privado y copias; un administrador del equipo continúa siendo una entidad de confianza. No pegar valores ni salidas de archivos privados en incidencias.

## Recuperación ejecutable en una D1 nueva

`backup:drill` continúa siendo un ensayo descartable. `recovery:plan` prepara una recuperación completa mediante el mismo importador parametrizado, incluso con logos/membretes de 400 KB. No usa credenciales ni red. Aplica las migraciones pendientes sobre una copia privada local y vincula la huella de sus archivos al plan: si el código cambia, exige otro ensayo. El respaldo original permanece intacto. Antes de guardar el plan ensaya realmente D1 local y verifica esquema, integridad, referencias y revocación de sesiones, enlaces de verificación/restablecimiento y códigos MFA de recuperación restaurados. Los usuarios, contraseñas hasheadas y factores TOTP cifrados se conservan: exige custodiar el PASSWORD_PEPPER y MFA_ENCRYPTION_KEY correspondientes. Los códigos MFA de recuperación anteriores quedan invalidados; renovar mediante el procedimiento del operador cuando corresponda.

Desde `quoter`, escoger un nombre **nuevo** con prefijo `quoter-recovery-` y Account ID de Cloudflare. `--custody-confirmed` declara que el operador comprobó la custodia de ambas claves; el código no puede verificar valores secretos remotos.

```powershell
npm run recovery:plan -- --file ".backups/RESPALDO.qdb" --account ACCOUNT_ID --name quoter-recovery-20261015 --out ".backups/recovery-plan.json" --custody-confirmed
```

Revisar el JSON privado: cuenta, nombre, archivo, hash del respaldo y `changesBindings:false`. El plan vence en 24 horas; para un nuevo intento o respaldo generar otro plan/nombre. No contiene claves ni datos de negocios. Los paths sí son metadatos privados del operador.

La ejecución siguiente es exclusivamente una acción consciente del operador con credenciales de infraestructura. Necesita `CLOUDFLARE_API_TOKEN` obtenido de su gestor seguro, con permisos D1 de la cuenta. No pasarlo como argumento ni pegarlo aquí. Este script usa la API fija de Cloudflare; no reutiliza automáticamente OAuth de Wrangler. Revisar la cuenta y el nombre antes de ejecutar:

```powershell
npm run recovery:apply -- --plan ".backups/recovery-plan.json" --confirm-name quoter-recovery-20261015
```

`apply` comprueba hash y descifrado, rechaza nombres existentes y **crea una D1 nueva**. No acepta ID de destino, no ejecuta Time Travel, no actualiza Workers, no cambia bindings y no elimina ninguna D1. Carga filas con parámetros e instala triggers después de los datos para evitar repetir efectos. Verifica cantidades por tabla, integridad/referencias/esquema y ausencia de credenciales revocadas. Guarda un recibo privado y un fragmento `*-binding-review.json` para revisión; ese fragmento no es una configuración desplegable por sí sola. Un fallo puede dejar una D1 nueva parcialmente cargada: mantenerla privada, consultar el ID del recibo/panel y eliminarla manualmente si se descarta. Nunca reutilizarla con `apply`; escoger un nombre y plan nuevos.

La copia completa contiene datos de todos los negocios. Una D1 nueva en Cloudflare continúa bajo la custodia del operador; no se vuelve pública al crearla. No activar un Worker de reemplazo público ni compartir su binding de revisión durante el ensayo. El ritmo fila por fila prioriza integridad sobre velocidad; medir su duración con el volumen real antes de prometer un RTO. El objetivo de dos horas sigue sin validación remota.

## Incidente real y reapertura

1. En el Worker publicado configurar el secreto `MAINTENANCE_READ_ONLY` con valor literal `true` mediante `npx wrangler secret put MAINTENANCE_READ_ONLY` o el panel. Las lecturas siguen; las mutaciones quedan bloqueadas con 503, incluso para administración. Los trabajos externos del operador también deben detenerse. Confirmar el bloqueo con una cuenta controlada. Registrar hora y tomar un respaldo del estado actual antes de reemplazarlo.
2. Elegir respaldo y comprobar su fecha/RPO. Ejecutar `recovery:plan`, revisar el plan y después `recovery:apply` únicamente hacia la D1 nueva. Para Time Travel, seguir el procedimiento de Cloudflare y revisar su ventana/retención de la cuenta; esta herramienta nunca hace rollback de la D1 vigente.
3. Conciliar fuera de la app cambios posteriores al respaldo: contraseñas/restablecimientos, MFA, usuarios suspendidos, permisos y activaciones/pagos P2P. El rollback puede recuperar una contraseña o permiso antiguo aunque sesiones/enlaces se hayan eliminado. No abrir el servicio hasta revocar o corregir esos accesos y cotejar comprobantes sin duplicar renovaciones. Guardar evidencia sin datos privados.
4. Revisar el ID nuevo del recibo y el fragmento de binding. En una copia de la configuración productiva, sustituir **solo** `database_name`/`database_id` del binding `DB` por los verificados. Mantener el mismo Worker y todos sus secretos, incluido `MAINTENANCE_READ_ONLY=true`, PASSWORD_PEPPER y MFA_ENCRYPTION_KEY. Conservar el ID de la D1 original para reversión controlada. Revisar el diff antes del despliegue; no usar el fragmento como configuración completa.
5. Desplegar desde el equipo autorizado, ejecutar `check:production` y comprobar lecturas con cuentas controladas. El mantenimiento permite login, MFA de acceso y lecturas, pero bloquea escrituras de negocio: para la aceptación completa preparar una ventana controlada por infraestructura y quitar el secreto mediante `npx wrangler secret delete MAINTENANCE_READ_ONLY` solo cuando la conciliación esté terminada y validar login/MFA/PDF. Si hay fallos, reactivar mantenimiento antes de continuar; no permitir tráfico abierto durante la validación pendiente.
6. Reabrir tras la aceptación, conservar la D1 original privada hasta cerrar el incidente y registrar duración/RPO reales. El cambio de binding y la reapertura son pasos manuales deliberados; `apply` no los efectúa. La API fake respaldada por D1 local valida el procedimiento automático, pero no certifica credenciales, cuota, duración ni servicio remoto.

## Evidencia reproducible

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run test:recovery
```

El último comando utiliza únicamente datos ficticios y bases temporales; prueba exportación D1 real, cifrado, importación D1, recuperación automática del límite SQL con logo/membrete de 400 KB sin pérdida, integridad/referencias/triggers, conservación de cuentas/MFA/cotizaciones y rechazo de claves incorrectas o restauración remota. No valida un respaldo de producción hasta ejecutar `backup:drill` con ese archivo.
