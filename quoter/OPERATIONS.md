# Operación y recuperación

Preparado el 15 de octubre de 2026. Estas herramientas no configuran por sí solas un servicio de monitoreo ni respaldos programados. No se ha respaldado ni restaurado la D1 publicada desde este entorno.

## Comprobación pública

Después de actualizar el código y desplegar desde la instalación con Wrangler autenticado:

```powershell
npm run deploy
npm run check:production -- --url https://quoter.cotizandome.workers.dev
```

La comprobación solo realiza GET sin credenciales: página/encabezados, disponibilidad D1 y configuración mínima, Turnstile, preview de correo desactivado y rechazo de acceso anónimo. No crea cuentas ni envía correos. Un resultado correcto no prueba que las claves externas sean válidas o que el remitente pueda entregar a cualquier destinatario.

`GET /api/health` devuelve exclusivamente `{"status":"ok"}` (200) o `{"status":"unavailable"}` (503). Comprueba conexión D1, migración 0017, tres triggers de seguridad y presencia/formato de configuración necesaria; no consulta clientes ni cotizaciones. Configurar un monitor HTTPS cada cinco minutos y alertar tras dos fallos consecutivos es el siguiente paso del operador; todavía no hay alertas externas configuradas. Conservar únicamente categorías de error y requestId en registros, nunca cuerpos, tokens ni respaldos.

## Respaldo completo D1, exclusivo del operador

El JSON de un negocio permite recuperar su contenido. La D1 completa contiene información privada de TODOS los negocios, cuentas, sesiones y factores cifrados: no se incorpora al panel maestro ni se comparte con clientes.

Desde `quoter`, con Node 24 y la configuración local apuntando a la D1 correcta:

```powershell
npm run backup:key
npm run backup:db -- --remote
npm run backup:drill -- --file ".backups/ARCHIVO-MOSTRADO-POR-EL-COMANDO.qdb"
```

`backup:key` genera una clave aleatoria de 256 bits en `.env.d1-backup-key.local`; conserva la existente. Guardarla en un gestor seguro, separada de los archivos `.qdb`. No mostrarla en chat ni en Git. En Windows, restringir también los permisos NTFS del directorio al operador: el modo POSIX 0600 no reemplaza sus ACL.

`backup:db` exige `--remote`, exporta sin modificar la D1 y guarda un archivo AES-256-GCM autenticado en `.backups/`. Cada archivo tiene nombre único. SQL temporal y logs de Wrangler se eliminan al terminar; un cierre forzado puede dejar un directorio `quoter-recovery-*` en los temporales del sistema, que debe custodiarse y eliminarse. Se admite hasta 128 MiB de SQL por archivo; para bases mayores utilizar el procedimiento nativo D1. Un error no deja un respaldo final presentado como válido.

`backup:drill` autentica el archivo antes de importar, utiliza siempre un estado D1 local temporal nuevo y verifica integridad, claves foráneas y esquema de seguridad. Rechaza `--remote` y elimina ese estado al terminar. No sustituye la base de producción ni el entorno habitual de desarrollo. Solo ejecutar respaldos confiables creados por el operador.

El ensayo utiliza su propia configuración temporal, sin reutilizar bindings, assets ni configuración generada por el despliegue. La salida por sentencia se guarda en un archivo temporal privado para evitar que un respaldo grande agote el buffer del proceso. Wrangler también escribe sus errores JSON en esa salida; si falla, solo se leen segmentos acotados para clasificarlos, y el archivo se elimina junto al resto del estado temporal. El diagnóstico muestra únicamente etapa (`import`, `verify` o `export`), categoría y código de salida; compartir esos campos permite continuar el diagnóstico sin enviar SQL, `.qdb` ni claves. Las categorías distinguen problemas de referencias, sintaxis/esquema, SQL restringido/transacciones/límites, runtime local, permisos, espacio y límite de salida. Un error de importación después del descifrado no demuestra que el archivo cifrado esté corrupto. No volver a generar la clave para intentar corregirlo.

Los respaldos no incluyen los secretos del Worker. Custodiar por separado **PASSWORD_PEPPER**, **MFA_ENCRYPTION_KEY**, clave del respaldo, configuración de bindings y procedimiento para renovar las claves Resend/Turnstile. Recuperar la D1 sin pepper o clave MFA puede impedir el acceso a cuentas existentes. `.gitignore` excluye estas claves y los respaldos; no adjuntarlos a incidencias ni artifacts de CI.

Propuesta inicial: respaldo diario y antes de migraciones, copia cifrada fuera del equipo, retención de siete diarios y cuatro semanales, ensayo mensual. Objetivos iniciales RPO 24 horas y RTO 2 horas; son objetivos por validar, no un SLA medido. No se ha automatizado esa periodicidad ni contratado almacenamiento externo.

## Incidente real

1. Detener nuevas escrituras durante la recuperación mediante mantenimiento operativo. Registrar hora y síntoma sin datos privados. Obtener un respaldo del estado actual antes de reemplazarlo.
2. Elegir un punto de recuperación y comprobar la ventana disponible de D1 Time Travel en la cuenta. Como alternativa, recuperar el respaldo en una D1 nueva; nunca ensayar sobre la base publicada. La herramienta `backup:drill` solo hace el ensayo local, no publica una restauración.
3. Verificar esquema, integridad, acceso con cuentas controladas y custodia de secretos. Antes de cambiar el binding o usar Time Travel, revisar el destino exacto y los datos que se perderían desde el punto elegido.
4. Al efectuar una recuperación real, invalidar sesiones y tokens de cuenta restaurados antes de reabrir. Un rollback puede resucitar sesiones, enlaces o contraseñas anteriores: revisar cambios de contraseña, MFA, suspensiones y permisos posteriores al respaldo, y forzar recuperación de acceso cuando corresponda. Revisar referencias de pagos P2P contra comprobantes para no perder renovaciones ni duplicarlas.
5. Desplegar el binding correcto conservando los secretos, ejecutar comprobaciones públicas y aceptación con cuentas propias, reabrir y registrar resultado/tiempo. La aplicación no aplica automáticamente estas acciones de incidente.

## Evidencia reproducible

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run test:recovery
```

El último comando utiliza únicamente datos ficticios y bases temporales; prueba exportación D1 real, cifrado, importación D1, integridad/referencias/triggers, conservación de cuentas/MFA/cotizaciones y rechazo de claves incorrectas o restauración remota. No valida un respaldo de producción hasta ejecutar `backup:drill` con ese archivo.
