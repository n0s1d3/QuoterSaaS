# Preparación de Cloudflare y Resend

Estado: cuentas creadas según el propietario; autenticación, recursos remotos, dominio, secretos y correo real todavía necesitan configuración y validación. Este documento no significa que se haya desplegado la aplicación.

## Cloudflare

Si Wrangler no puede completar el callback localhost dentro del entorno remoto, iniciar sesión desde la instalación local de Windows, donde el navegador y Wrangler comparten localhost:

```powershell
cd C:\QuoterSaaS\quoter
npx wrangler login
npx wrangler whoami
```

Alternativa para el entorno de trabajo remoto: configurar un API token con los permisos necesarios mediante el mecanismo seguro de secretos del entorno. No pegar tokens en el chat ni guardarlos en Git.

Elegir la URL: dominio propio o una URL workers.dev inicial. Crear la D1 de producción y sustituir el ID provisional `00000000-0000-0000-0000-000000000000` de wrangler.jsonc por el ID del recurso. Los datos locales no se trasladan automáticamente. Aplicar todas las migraciones a esa D1 y designar la cuenta maestra en ella mediante el comando de operador; la designación local no se publica con el código.

Crear un widget Turnstile para el hostname público. Configurar TURNSTILE_SITE_KEY como variable y TURNSTILE_SECRET_KEY como secreto. Configurar también MFA_ENCRYPTION_KEY como secreto del Worker: una clave aleatoria de 32 bytes en hexadecimal que se conservará en siguientes despliegues. Las claves locales no deben copiarse al repositorio ni al navegador.

Verificar HTTPS, permisos mínimos, límites de CPU y almacenamiento, observabilidad y recuperación D1. Ajustar SIGNUP_DAILY_LIMIT al presupuesto de correo y al tamaño esperado del piloto. Compilar y revisar el resultado antes de desplegar. No publicar Vite/Wrangler dev ni archivos .dev.vars, .env o respaldos. El secreto MFA requiere custodia independiente; el JSON de negocio no contiene factores de autenticación.

## Resend

Para enviar a clientes, verificar un dominio de envío mediante sus registros DNS. Definir MAIL_FROM con una dirección de ese dominio y APP_URL con la URL HTTPS real de Quoter. Configurar RESEND_API_KEY como secreto privado del Worker y retirar EMAIL_MODE=preview de producción. Una cuenta Resend creada por sí sola no proporciona un remitente verificado.

El dominio de envío puede ser distinto al hostname de la app. Una URL workers.dev sirve para probar la app; no proporciona por sí misma un dominio propio para verificar en Resend. El remitente de prueba de Resend tiene restricciones y no sustituye la configuración de envío a clientes.

## Prueba de aceptación antes de abrir a clientes

Verificar registro con Turnstile real, recepción/consumo de verificación, inicio de sesión y recuperación real. Luego comprobar MFA del maestro, aislamiento entre negocios, cotización con logo y descarga PDF desde móvil/escritorio, renovación P2P, vencimientos y restauración. Confirmar ausencia de secretos en assets y que HTTP redirige a HTTPS. Comprobar los límites y el coste de PBKDF2 en el runtime publicado. Un despliegue exitoso por sí solo no marca el 100 %.

Las pruebas que envíen correo real deben realizarse con destinatarios propios acordados; no se ha enviado correo externo en esta etapa.

## Primera prueba sin dominio comprado

Usar la URL gratuita workers.dev para la app. Para probar Resend sin dominio propio, configurar MAIL_FROM como `Quoter <onboarding@resend.dev>`. Este remitente de prueba solo permite enviar a la dirección asociada a la cuenta Resend; comprobar cuál es antes de iniciar la prueba. No utilizar una dirección gmail.com como MAIL_FROM: el propietario de Quoter no puede verificar el dominio gmail.com en Resend. Gmail puede mantenerse como correo de cuenta/contacto.

Esta combinación sirve para probar la cuenta propia, la verificación y recuperación. No habilita correos de acceso a clientes con direcciones distintas: para ese lanzamiento será necesario un dominio de envío verificado o cambiar de proveedor con un mecanismo autorizado para el remitente elegido. No publicar como lista para clientes una instalación que no puede entregar sus verificaciones.

## Migraciones 0016/0017 pendientes por incomplete input

Se reescribieron los SELECT de rechazo de los triggers sin CASE/END internos, manteniendo la misma validación de sesiones, roles y MFA. La migración 0016 admite una tabla ya creada durante un intento parcial. Se verificó la instalación completa en D1 local y el rechazo/aceptación por sesión, rol y segundo factor en SQLite. La ejecución remota debe confirmarse con la cuenta conectada.

Actualizar el código y repetir `npx wrangler d1 migrations apply quoter-db --remote`. No recrear la base ni borrar tablas: Wrangler conserva el registro de migraciones completadas. Si vuelve a fallar, revisar la salida antes de ejecutar sentencias manuales, especialmente ALTER TABLE de la 0017.
