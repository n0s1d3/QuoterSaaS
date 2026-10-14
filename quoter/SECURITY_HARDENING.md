# Refuerzo de contraseñas, logos y registro

14 de octubre de 2026. Implementado y probado localmente; no implica que Cloudflare, Turnstile o Resend ya estén conectados a cuentas reales.

## Hash versionado y cuentas existentes

Nuevas contraseñas: PBKDF2-HMAC-SHA256, 600.000 iteraciones, sal aleatoria de 256 bits. Formato almacenado: `pbkdf2-sha256$600000$<digest>`, con sal en su campo existente. No hay contraseñas en texto plano ni cifrado reversible.

Las cuentas con el hash anterior de 100.000 iteraciones siguen funcionando. Solo después de comprobar correctamente la contraseña se calcula un nuevo hash y una nueva sal. El UPDATE comprueba hash, sal y estado previos; si hubo un cambio concurrente, no lo sobrescribe ni abre la sesión con información anterior. Un intento fallido no actualiza la credencial. Los enlaces de recuperación crean directamente el formato nuevo. Confirmación de correo y contraseña administrativa aceptan ambos formatos.

No se requiere una migración SQL ni pedir cambio de contraseña. No volver a una versión de la aplicación que solo lee el formato antiguo después de iniciar esta actualización; cualquier rollback debe conservar el lector compatible.

Se verificaron 600.000 iteraciones en workerd con la fecha de compatibilidad usada por la app. Una derivación de prueba tardó aproximadamente 73 ms de tiempo de pared local. El coste de CPU, límites del plan y comportamiento del Worker publicado deben comprobarse antes de aceptar clientes. No se baja automáticamente el coste si falla el runtime.

## Validación de logos

La API acepta hasta 400.000 caracteres de data URL, solo PNG/JPEG/WebP con base64 canónico, firma y MIME consistentes. Rechaza SVG/HTML disfrazados, animaciones, archivos truncados detectables y dimensiones excesivas. Límite almacenado: 2.048 por lado y 4.194.304 píxeles.

PNG: comprobación de estructura y CRC; expansión deflate de IDAT limitada al tamaño de las filas declaradas, incluidos pases Adam7. Los metadatos comprimidos tienen un presupuesto adicional conjunto de 1 MiB. Se evita procesar expansiones arbitrarias antes de entregarlas al generador PDF.

JPEG/WebP: estructura de segmentos/chunks, firmas de imagen y dimensiones; no se decodifica completamente su contenido en el servidor. La validación no garantiza que todo contenido sea visualmente válido ni protege contra cualquier fallo futuro de un decodificador. El navegador normaliza los logos a PNG antes de guardarlos.

La carga local sigue admitiendo hasta 10 MiB, con un máximo previo a decodificar de 8.192 por lado y 16.777.216 píxeles; después se reduce a un máximo de 640 por lado. Antes de generar PDF también se valida la marca, incluso si procede de una cotización antigua.

Los respaldos aplican los mismos controles a la marca de negocio y snapshots. Se valida la expansión de cada logo distinto y el conjunto admite como máximo 16.777.216 píxeles de logos distintos. No se eliminan marcas históricas: un archivo inseguro impide la operación con un error visible y debe reemplazarse por un logo válido.

## Turnstile y límites de registro

Registro y recuperación públicos exigen Cloudflare Turnstile. La API comprueba la prueba contra el origen fijo de Siteverify y requiere éxito, hostname igual al recibido y acción correcta (`quoter_register` o `quoter_recovery`). El proveedor valida vigencia y uso único. Una falla del proveedor, claves ausentes o prueba inválida no permiten continuar.

El navegador carga el widget oficial y envía su token. La CSP permite únicamente el origen adicional `https://challenges.cloudflare.com` para scripts, conexión y frame de ese servicio. El sitio no confía en un simple checkbox ni en una validación exclusiva del navegador.

Configurar:

- `TURNSTILE_SITE_KEY`: clave pública del widget.
- `TURNSTILE_SECRET_KEY`: secreto privado del Worker, nunca una variable VITE_.
- Hostname público en la configuración del widget.
- Opcional `SIGNUP_DAILY_LIMIT`: entero de 1 a 10.000, valor por defecto 250 registros por día UTC para toda la plataforma. Es un presupuesto operativo, independiente de los planes. Los rechazos devuelven 429 y Retry-After.

La excepción de pruebas exige simultáneamente EMAIL_MODE=preview y hostname loopback. Declarar preview en una URL pública no deshabilita Turnstile. Los tests pueden usar preview sin contactar a Cloudflare ni enviar correos reales.

Turnstile y límites reducen abuso; no sustituyen WAF, vigilancia de D1, alertas o presupuestos de almacenamiento. No hay limpieza automática de clientes, archivo o papelera. No se realizaron pruebas de saturación distribuidas. La efectividad de las claves, hostname, desafíos y códigos de un solo uso debe validarse con el servicio real al conectar Cloudflare.

## Verificación

44 pruebas unitarias aprobadas, compilación y lint correctos. Pasaron test:hardening, test:security, test:auth, test:email, test:api, test:mfa, test:admin, test:ui y test:data.

Pruebas de formatos antiguos/nuevos y hash de 600.000 iteraciones; firmas/MIME falsificados, dimensiones, CRC y expansión PNG; condiciones de éxito/rechazo de Siteverify con respuestas simuladas; interfaz del widget con SDK simulado, envío/limpieza del token y vencimiento; pruebas nativas de Worker con cuentas, archivos PNG/JPEG/WebP reales, normalización y descarga PDF, respaldos y presupuesto diario. La prueba del presupuesto utiliza una D1 separada y restablece el contador tras su comprobación.

`npm run test:hardening` requiere `QUOTER_ADMIN_ISOLATED=1`, `QUOTER_IMPORT_STATE` y `QUOTER_TEST_URL`; con `QUOTER_BROWSER_PATH` comprueba carga/normalización/PDF desde Chromium. No ejecutar esta prueba sobre datos reales.
