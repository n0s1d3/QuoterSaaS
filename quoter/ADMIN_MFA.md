# Segundo factor para Administración

El panel maestro exige una contraseña de cuenta válida y un segundo factor. El factor se configura al entrar por primera vez. No cambia el acceso normal de otros negocios.

## Instalación local (Windows, macOS o Linux)

Desde `quoter`, con el servidor detenido:

```sh
git pull
npm install
npm run db:migrate
npm run mfa:setup
npm run dev
```

`mfa:setup` crea una clave de cifrado aleatoria en `.dev.vars`, sin mostrarla y sin reemplazar una existente. También endurece archivos regulares existentes a 0600 en POSIX y rechaza enlaces simbólicos. En Windows revisar las ACL NTFS con el procedimiento de OPERATIONS.md; chmod no las configura. Ese archivo está excluido de Git. Se requiere la migración 0017; si el servidor no tiene la clave, Administración permanece bloqueada y muestra que falta configuración. La aplicación normal no necesita esa clave.

Entrar con la cuenta maestra verificada. Elegir Configurar autenticador y confirmar la contraseña actual. En Google Authenticator, Microsoft Authenticator, 1Password u otra aplicación compatible, agregar una cuenta manualmente con la clave mostrada y tipo basado en tiempo. También puede abrirse el enlace `otpauth://` desde un dispositivo con un autenticador instalado. Introducir el código de seis dígitos y guardar los ocho códigos de recuperación antes de continuar. No se genera un QR en esta versión; la configuración manual es equivalente.

La configuración pendiente vence en 20 minutos. Los códigos son de seis dígitos cada 30 segundos, con tolerancia de un intervalo para desfase de reloj. Un código aceptado no se reutiliza. Un código de recuperación también funciona una sola vez; guardar los códigos fuera del navegador en un lugar privado. No se vuelven a mostrar ni se incluyen en los respaldos JSON del negocio.

La pantalla de segundo factor permite seleccionar **una hora (predeterminado), 90 o 180 días**. Para modificar un acceso que ya está activo, usar **Cambiar duración 2FA** en Administración y comprobarlo con un código nuevo o un código de recuperación sin usar. No es necesario volver a configurar el autenticador. Los códigos de seis dígitos siguen cambiando cada 30 segundos; el plazo elegido corresponde a la autorización del navegador.

Con 90 o 180 días también se amplía la sesión de cuenta de ese navegador hasta la misma fecha; de otro modo, su vencimiento habitual a los siete días interrumpiría el acceso recordado. El plazo es fijo desde la comprobación: visitar la app, consultar el estado o recargar no lo renueva. Las sesiones de otros navegadores y de los demás usuarios no se amplían. Elegir una hora de nuevo limita el 2FA a una hora y la sesión de cuenta a un máximo de siete días, sin prolongar una sesión más corta.

Usar plazos largos solo en equipos personales. Cerrar sesión, borrar las cookies, restablecer la contraseña, desactivar la cuenta o restablecer el factor por operador revoca el acceso. Iniciar sesión de nuevo exige un nuevo código; no se conserva confianza entre sesiones distintas ni entre navegadores. Eliminar cookies o usar navegación privada puede terminar el acceso antes del plazo elegido. No se ofrece duración indefinida.

El servidor valida exclusivamente los plazos permitidos y exige prueba válida para cambiarlos. Al comprobar el segundo factor se sustituye el token de esa sesión por uno aleatorio nuevo: el token previo deja de servir. La cookie sigue siendo HttpOnly, SameSite=Strict, Path=/ y Secure con prefijo __Host- en HTTPS; D1 conserva solo su hash. La expiración del servidor coincide con la de la cookie para los plazos largos. Las acciones administrativas siguen pidiendo la contraseña además del factor de sesión. La interfaz comprueba periódicamente el vencimiento y el servidor lo exige inmediatamente. Cada comprobación posterior a la inscripción registra `mfa.session.verified` con el plazo, sin claves ni códigos.

## Protección y configuración de producción

La clave TOTP se cifra con AES-256-GCM, nonce aleatorio y asociación con el ID de cuenta. D1 almacena el secreto cifrado; los códigos de recuperación se almacenan como hashes SHA-256 de valores aleatorios de 128 bits. Hay límite de 10 intentos por 15 minutos por cuenta; el servidor y el navegador no registran códigos o claves.

Antes de desplegar, configurar `MFA_ENCRYPTION_KEY` como secreto del Worker: 32 bytes aleatorios representados por 64 caracteres hexadecimales. Usar `wrangler secret put MFA_ENCRYPTION_KEY` o el panel Cloudflare. Nunca utilizar una variable `VITE_` ni colocar la clave en el repositorio. No publicar los archivos de desarrollo generados en `dist/quoter/.dev.vars`.

Conservar la clave de servidor durante nuevos despliegues y respaldarla de forma privada junto con el procedimiento de recuperación de D1. Cambiarla sin recifrar los factores existentes impide validar sus códigos TOTP. Una copia de la D1 completa debe tratarse como información privada; el respaldo JSON de negocio no contiene estos factores.

El cifrado protege una filtración de D1 sin la clave del Worker. Un atacante que obtiene ambas puede descifrar el factor. TOTP reduce el riesgo de una contraseña robada, pero no es resistente a phishing como una passkey; la sesión autorizada sigue siendo sensible.

## Si se pierde el autenticador

Usar un código de recuperación para entrar. Si también se pierden los códigos, un operador con acceso directo a la infraestructura puede restablecer solo el factor de la cuenta actualmente designada como maestra:

```sh
npm run admin:reset-mfa -- --email correo-maestro
```

Agregar `--remote` únicamente cuando se quiera modificar la D1 publicada. El restablecimiento elimina el factor, invalida sus códigos de recuperación, revoca todas sus sesiones y registra `mfa.reset` sin secretos. Luego iniciar sesión y configurar un nuevo factor. La API de la app no permite retirar el factor usando solo una contraseña ni restablecer factores de terceros. Esta operación requiere acceso de operador a D1 y no comprueba por sí misma la identidad humana: el operador debe verificarla fuera de la aplicación.

## Pruebas

Las pruebas unitarias incluyen vectores RFC 6238, códigos vencidos/reutilizados y cifrado ligado a la cuenta. `test:mfa` comprueba inscripción obligatoria, contraseña de configuración, recuperación concurrente de un solo uso, aislamiento entre sesiones, vencimiento, privacidad de respaldos, restablecimiento por operador y acceso desde móvil. `test:admin` conserva las pruebas de privacidad, activación de planes y permisos, ahora con MFA.

La suite aislada `mfa-duration-smoke` comprueba plazos 90/180 en inscripción y verificación, duración fija de cookie/servidor, rechazo de plazos inválidos, sustitución del token, aislamiento entre sesiones, vuelta a una hora, vencimiento y revocación por cierre, recuperación de contraseña y restablecimiento del factor. También recorre el selector y el cambio de duración en móvil. Se ejecuta con `npm run test:integration -- mfa-smoke mfa-duration-smoke`. No se requiere una nueva migración para este selector: usa las columnas de la migración 0017.

Las pruebas MFA y administrativas cambian la designación de cuenta maestra: usar exclusivamente un estado D1 local aislado, con `QUOTER_ADMIN_ISOLATED=1`, `QUOTER_IMPORT_STATE`, `QUOTER_TEST_URL` y, opcionalmente, `QUOTER_BROWSER_PATH`. No usar una base con clientes o una cuenta maestra real.
