> Documento histórico. El hash vigente usa PBKDF2 nativo de 100.000 iteraciones con pepper independiente, por compatibilidad de Workers; no el formato de 600.000 descrito en la revisión original. Consultar PASSWORD_SECURITY.md y REMEDIATION.md para el estado actual. Los conteos de pruebas de abajo corresponden a su fecha original.

# Revisión de seguridad de Quoter

Fecha: 14 de octubre de 2026. Alcance: código del cliente React, Worker, rutas de autenticación y administración, migraciones D1, importación/exportación, PDF y dependencias instaladas. Se revisaron controles y se ejecutaron pruebas adversariales locales con cuentas y negocios de prueba. No se auditó un despliegue público, la configuración de una cuenta Cloudflare, la entrega real de Resend ni la resistencia a ataques de carga distribuidos.

## Hallazgos corregidos

| Prioridad | Debilidad | Corrección |
| --- | --- | --- |
| Alta | La verificación del correo podía convertir sesiones anteriores a la verificación en sesiones utilizables. Una cuenta creada por un atacante con el correo de otra persona podía habilitarse si esa persona verificaba el enlace por error. | Verificar exige también la contraseña actual. La comprobación tiene límite de intentos. Verificación y restablecimiento revocan todas las sesiones; se debe iniciar sesión de nuevo. La transacción comprueba que la contraseña no cambió entre su validación y el consumo del enlace. |
| Alta | La autorización se comprobaba antes de escribir. Una revocación de sesión, suspensión o reducción de permisos concurrente podía dejar una escritura autorizada con información anterior. | La migración 0016 y `request-authorization.ts` comprueban sesión, usuario, negocio y rol dentro de la misma transacción que la escritura. Incluye `run`, `batch` y mutaciones con resultados mediante `first`/`all`. La operación completa falla si cambió el acceso. |
| Media | Lectura de cuerpos JSON sin un límite común antes de procesarlos; la restauración también podía acumular un cuerpo demasiado grande. | Lectura incremental limitada por bytes reales, independiente de Content-Length: 16 KiB en autenticación, 1 MiB en JSON general y 8 MiB más 4 KiB de envoltorio en restauración. Las solicitudes excedidas reciben 413. Se descarta como máximo 1 MiB adicional para drenar el transporte local; después se cancela. Se valida UTF-8 y el tamaño original de los campos de texto. |
| Media | Faltaban restricciones explícitas para scripts, incrustación y otras capacidades de las páginas estáticas. | `_headers` añade CSP, protección contra marcos, nosniff, política de referente y permisos, además de HSTS. La CSP admite imágenes data/blob y estilos internos usados por la marca, pero no scripts internos ni eval. |
| Media | Las solicitudes de escritura sin Origin no comprobaban explícitamente Sec-Fetch-Site; la API podía aceptar HTTP fuera de localhost. | Se rechazan mutaciones cross-site incluso sin Origin. Se conserva la comparación exacta de Origin, JSON y cookies SameSite=Strict. La API exige HTTPS excepto en direcciones loopback de desarrollo. |
| Preventiva | Registrar excepciones completas podía incluir detalles de SQL o información sensible en ciertos errores. | Los errores inesperados registran categoría, tipo permitido e identificador de solicitud; no el cuerpo, SQL, contraseñas ni la excepción completa. |

La comprobación transaccional utiliza filas temporales eliminadas antes del commit. No conserva tokens de sesión en esa tabla. Cada escritura protegida añade dos sentencias; debe considerarse en las cuotas y pruebas de rendimiento de D1.

## SQL injection y aislamiento entre negocios

No se encontró una inyección SQL explotable en las rutas revisadas. Los valores se pasan con sentencias preparadas y `bind`; los nombres dinámicos de tablas, columnas y ordenaciones proceden del código o de listas permitidas. No deben sustituirse estas vinculaciones por interpolación de texto en cambios futuros.

Se comprobó que un nombre como `Robert'); DROP TABLE customers; --` se guarda como texto, que búsquedas e identificadores maliciosos no ejecutan SQL, que otro negocio no puede obtener una cotización por su ID y que no puede utilizar clientes ajenos para crearla. Las escrituras siguen verificando cuotas, vigencia y suspensión mediante sus controles de base de datos.

El panel maestro expone metadatos operativos permitidos: identificación de cuentas/negocios, planes y estado. No proporciona suplantación de usuarios ni acceso a clientes, montos, partidas, documentos o respaldos de otros negocios. Esto limita la cuenta maestra de la aplicación; no impide que un operador con acceso directo a D1 lea los registros. No existe cifrado de los datos de cada negocio con claves independientes.

## Contraseñas, sesiones y recuperación

Las contraseñas ya estaban protegidas; no se guardan en texto plano ni con un cifrado reversible. Al inicio de la revisión se usaba PBKDF2-HMAC-SHA256 con 100.000 iteraciones, una sal aleatoria de 256 bits por contraseña y comparación de digests. Una contraseña idéntica produce hashes diferentes con sales distintas. La sal no es un secreto y debe conservarse para validar el acceso.

Los tokens de sesión y de correo son aleatorios y se guardan como hashes SHA-256. Las sesiones tienen vencimiento, cookies HttpOnly y SameSite=Strict; en HTTPS se usan Secure y el prefijo __Host. Los enlaces de verificación y recuperación vencen, son de un solo uso y su consumo es transaccional. La recuperación mantiene respuestas genéricas para no revelar si existe una cuenta.

**Seguimiento:** el runtime actual admitió PBKDF2-HMAC-SHA256 con 600.000 iteraciones en una prueba nativa de Workers (aproximadamente 73 ms de tiempo de pared local; no representa CPU o latencia del servicio público). Nuevas cuentas y recuperaciones usan un hash versionado de 600.000 iteraciones; las cuentas antiguas se actualizan con una nueva sal al iniciar sesión correctamente, con comprobación atómica de la credencial anterior. La lectura del hash sigue siendo compatible con el formato anterior. Debe confirmarse el presupuesto de CPU del plan Cloudflare y el comportamiento remoto antes de publicar. Referencia: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

## Cliente, PDF, archivos y dependencias

React presenta el contenido como texto; no se observó uso peligroso de innerHTML/eval en el código propio revisado. Se probó una nota con HTML malicioso en la vista de cotización: no creó un elemento ejecutable ni ejecutó JavaScript. Se verificó que el PDF siguiera descargándose bajo la CSP del cliente compilado. Las notas internas siguen excluidas del PDF.

La restauración valida y proyecta campos, descarta datos de autenticación y campos no permitidos, comprueba referencias y totales, y requiere autorización del propietario. Los respaldos no contienen contraseñas ni hashes. Los CSV neutralizan valores que podrían interpretarse como fórmulas. El envío de correo usa el origen fijo del proveedor; no recibe del cliente una URL arbitraria para buscar contenido.

`npm audit` no reportó vulnerabilidades conocidas en las dependencias instaladas. La búsqueda de patrones de claves privadas, tokens GitHub, claves Resend y claves AWS en archivos rastreados no encontró coincidencias. Esto no garantiza ausencia de secretos de otros formatos ni de fallas desconocidas.

## Riesgos pendientes y siguiente orden recomendado

1. **Cuenta maestra: seguimiento resuelto en código.** Se añadió MFA TOTP obligatorio para Administración, secreto cifrado AES-GCM, autorización de una hora ligada a la sesión, códigos de recuperación de un solo uso y restablecimiento exclusivo por operador con revocación de sesiones. Véase [ADMIN_MFA.md](ADMIN_MFA.md). Queda pendiente inscribir el autenticador real del propietario y configurar la clave del servidor publicado. TOTP no es resistente a phishing como una passkey.
2. **Abuso de registro y disponibilidad.** Se integró Turnstile validado por servidor para registro/recuperación, con límite diario global configurable (250 por defecto) además de límites por IP/cuenta. Las claves y el hostname real aún deben configurarse. Clientes, archivo y papelera siguen fuera de las cuotas comerciales; monitorear D1 y acordar presupuestos de almacenamiento/retención. No se realizó una prueba de saturación del servicio.
3. **Fortaleza del hash.** Actualización versionada implementada y verificada con cuentas antiguas/nuevas. Medir CPU/latencia en el entorno final y conservar compatibilidad del lector al planificar un rollback.
4. **Enumeración y bloqueo dirigido.** El registro revela si un correo ya existe. El límite de intentos por correo puede usarse para bloquear temporalmente a una persona. Revisar respuestas y combinar señales de abuso/captcha sin retirar la protección contra fuerza bruta.
5. **Logos no confiables.** Se añadieron comprobaciones de firmas, dimensiones, estructura y MIME en API, respaldos e interfaz. PNG además comprueba CRC y limita expansión de imagen/metadatos. JPEG/WebP se inspeccionan estructuralmente sin una decodificación completa del servidor; no se consideran libres de posibles fallas del decodificador. La descarga PDF realiza prevalidación, incluida para marcas históricas.
6. **Operación y privacidad.** Los respaldos JSON son archivos sin cifrar; quien obtiene el archivo puede leer sus datos. Proteger descargas y copias, permisos D1 y secretos del proveedor. Agregar controles de CI y revisiones periódicas de dependencias.
7. **Publicación.** Nunca exponer Vite/Wrangler dev ni su explorador de base de datos como servicio público. No publicar `.dev.vars`, `.env`, `.wrangler` ni respaldos. El modo EMAIL_MODE=preview es solo local: devuelve enlaces de prueba y no sustituye un proveedor real. Publicar únicamente el Worker y sus assets compilados; configurar HTTPS, secretos y permisos mínimos en Cloudflare. HSTS no sustituye una redirección HTTPS inicial en el dominio.

## Validación y actualización

Las pruebas incluyen hashing, límites de cuerpos (también chunked), CSRF, HTTPS, SQL literal, aislamiento entre negocios, revocación y reducción de permisos dentro de la transacción, verificación de correo, CSP, XSS y descarga PDF. Resultado: 36 pruebas unitarias aprobadas, lint y build aprobados. Pasaron `test:security`, `test:auth`, `test:email`, `test:api`, `test:business`, `test:data`, `test:plans`, `test:ui`, `test:admin`, `test:subscription`, `test:customer-import` y `test:activation`. Las pruebas de seguridad y administrador incluyeron Chromium. También se ejecutaron pruebas de los flujos existentes para detectar regresiones. Son evidencia local, no una certificación de seguridad del despliegue público.

Actualizar el código y aplicar las migraciones antes de arrancar:

```sh
npm install
npm run db:migrate
npm run dev
```

La migración nueva es `0016_atomic_request_authorization.sql`. En una futura publicación, aplicar las migraciones a la D1 remota correspondiente con Wrangler, antes de activar este código; no se ha desplegado ni modificado una base remota en esta revisión.

Pruebas básicas:

```sh
npm test
npm run lint
npm run build
```

`npm run test:security` necesita un servidor local con migraciones aplicadas y EMAIL_MODE=preview. Crea registros de prueba. `QUOTER_TEST_URL` selecciona su URL; `QUOTER_IMPORT_STATE` debe coincidir con el directorio de persistencia D1 del servidor. `QUOTER_BROWSER_PATH` habilita la prueba de Chromium y debe usarse con los assets compilados para comprobar `_headers`. Las pruebas de administrador requieren un estado aislado: no deben ejecutarse sobre los datos reales del administrador.

Después de confirmar el correo, el usuario ahora debe iniciar sesión de nuevo con su contraseña. Las sesiones anteriores a la verificación dejan de funcionar deliberadamente.


Seguimiento de esta revisión: véase [SECURITY_HARDENING.md](SECURITY_HARDENING.md) para las mejoras posteriores y sus pruebas.

Seguimiento de compatibilidad en producción: el registro falló en la criptografía con el formato de 600.000 iteraciones; la nueva versión utiliza 100.000 iteraciones y un pepper independiente. Esto no equivale al coste recomendado de 600.000; las condiciones y medidas restantes se explican en [PASSWORD_SECURITY.md](PASSWORD_SECURITY.md). Requiere PASSWORD_PEPPER estable en el servidor.
