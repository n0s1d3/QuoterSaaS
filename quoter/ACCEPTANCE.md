# Aceptación antes del piloto

Estado al 15 de octubre de 2026. El propietario confirmó acceso online y pruebas básicas satisfactorias tras configurar Cloudflare y Resend. Esto no acredita automáticamente todos los casos siguientes. Desde el entorno de desarrollo el proxy bloquea el acceso a workers.dev; la comprobación pública debe ejecutarse desde el equipo del operador.

| Prueba | Evidencia / estado |
| --- | --- |
| Compilación, tipos, lint y pruebas unitarias | Verificados localmente; repetir `npm run verify` con el runner aislado |
| Exportar, cifrar y restaurar D1 | Ensayo local con datos ficticios aprobado; el propietario confirmó respaldo real y ensayo aprobado; pendiente ensayo de reemplazo del servicio publicado |
| Acceso online y verificación de la cuenta propia | Confirmado por el propietario |
| HTTPS, encabezados, salud y rechazo anónimo | Ejecutar `npm run check:production -- --url https://quoter.cotizandome.workers.dev` después del nuevo despliegue |
| Recuperación de contraseña | Probar recepción, uso único y rechazo del enlace usado, con correo propio |
| MFA maestro | Probar inscripción, login, código incorrecto y recuperación de un solo uso; guardar códigos fuera de la app |
| Dos negocios separados | Con cuentas controladas, comprobar que cambiar IDs no permite leer/escribir datos ajenos; no usar datos de clientes reales |
| Cotización y PDF móvil/escritorio | Crear, editar, duplicar, cambiar estado y descargar; probar Clásica, Lateral, Minimalista y Corporativa, vista previa, logo visible y notas internas ausentes del PDF |
| JSON | Reimportar el mismo archivo dos veces: sin duplicar clientes ni cotizaciones; revisar vista previa antes de aplicar |
| Planes P2P | Renovar con referencia propia, repetirla sin doble activación, verificar cupos y solo lectura al vencer |
| Operación | Custodia de secretos, copia externa, recuperación real documentada y monitor con alertas pendientes |
| Correo a clientes | Pendiente dominio de envío verificado; el remitente de prueba de Resend solo sirve para la cuenta propia autorizada |
| Comercial / piloto | Definir precios, instrucciones P2P, soporte/privacidad y probar con pocos clientes tras habilitar sus correos |

Registrar fecha, versión desplegada y resultado de cada prueba. No pegar contraseñas, tokens, códigos MFA, datos privados ni respaldos en el registro. Los flujos de prueba que envían correo deben usar destinatarios propios acordados. Enlaces públicos de cotizaciones, WhatsApp, facturas y cobro automático siguen fuera del alcance de este primer lanzamiento.
