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

Una autorización de segundo factor dura una hora y está vinculada a la sesión. Iniciar sesión de nuevo exige un nuevo código. Cerrar sesión, restablecer la contraseña o desactivar la cuenta revoca el acceso. Las acciones administrativas siguen pidiendo la contraseña además del factor de sesión. La interfaz comprueba periódicamente el vencimiento y el servidor lo exige inmediatamente.

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

Las pruebas MFA y administrativas cambian la designación de cuenta maestra: usar exclusivamente un estado D1 local aislado, con `QUOTER_ADMIN_ISOLATED=1`, `QUOTER_IMPORT_STATE`, `QUOTER_TEST_URL` y, opcionalmente, `QUOTER_BROWSER_PATH`. No usar una base con clientes o una cuenta maestra real.
