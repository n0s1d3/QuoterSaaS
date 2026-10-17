# Estado y camino a la primera publicación

Actualizado el 17 de octubre de 2026. Avance estimado: **93 %** hacia una versión online, revisada y lista para clientes. Es una estimación de preparación, no cobertura de pruebas ni porcentaje del tiempo restante. El propietario confirmó despliegue, acceso online y pruebas básicas satisfactorias. Cloudflare D1, secretos, Turnstile y correo de la cuenta propia ya se configuraron; falta completar la aceptación pública y la preparación operativa/comercial. Los 19 hallazgos de código de la auditoría ya tienen reparación o un procedimiento concreto; ver REMEDIATION.md para la evidencia y los límites externos. La cifra no aumenta automáticamente por una verificación exclusivamente local.

## Disponible y validado localmente

- Cuentas, confirmación de contraseña, verificación de correo y recuperación de acceso.
- Negocios separados, roles, invitaciones, acceso de solo lectura por vencimiento y administración maestra con privacidad limitada.
- Cotizaciones, catálogo, clientes integrados, totales calculados por servidor, estados, edición, duplicación y papelera.
- PDF con membrete y marca, con notas internas excluidas; cambio de marca por cotización.
- Resumen compacto, gráficos, recordatorios y vistas responsive.
- Respaldos y restauración sin duplicación de cotizaciones/clientes, validación e historial.
- Tres planes, cuotas, prueba de siete días, meses de vigencia y renovación P2P manual por referencia única.
- Revisión de seguridad, límites de solicitudes, sesiones/roles comprobados durante escrituras, encabezados de navegador y segundo factor obligatorio para el panel maestro.
- Hashes versionados con PBKDF2 nativo de 100.000 iteraciones y pepper independiente, con compatibilidad de formatos previos según runtime; validación de archivos de logo y expansión PNG limitada. El uso de 600.000 iteraciones en una sola llamada falló durante el registro publicado; véase PASSWORD_SECURITY.md.
- Integración Turnstile para registro/recuperación y presupuesto diario de registros; claves y hostname configurados por el propietario.

## Falta para declarar 100 %

| Área | Trabajo pendiente | Evidencia necesaria |
| --- | --- | --- |
| Aceptación publicada | Completar la matriz de ACCEPTANCE.md con cuentas controladas | MFA, recuperación, aislamiento, PDF, cuotas y renovaciones verificados en HTTPS |
| Correo a clientes | Dominio de envío verificado y remitente autorizado | Verificación/recuperación entregadas a destinatarios del piloto; Resend de prueba solo cubre la cuenta propia |
| Operación | Respaldo real y ensayo local confirmados; falta copia externa, monitor con alertas y ensayo de reemplazo publicado | Procedimiento de OPERATIONS.md ejecutado con producción; custodia separada de secretos |
| Comercial | Precios e instrucciones P2P, soporte y privacidad | Pago y renovación entendibles, referencia repetida sin doble activación |
| Piloto | Usuarios iniciales y revisión de incidencias | Flujos completos sin fallos pendientes que impidan trabajar |

La recuperación D1 tiene respaldo cifrado, ensayo aislado, procedimiento ejecutable de reemplazo en una D1 nueva y modo mantenimiento. El respaldo real y su ensayo local fueron confirmados por el propietario; no se ejecutó la sustitución remota. La comprobación pública es de solo lectura. Estas herramientas no implican que los respaldos diarios, el monitoreo externo o el ensayo de producción ya estén operando.

Ver [OPERATIONS.md](OPERATIONS.md) y [ACCEPTANCE.md](ACCEPTANCE.md). Los enlaces públicos, WhatsApp, conversión a facturas y cobro automático siguen al final de la lista, fuera del alcance de este primer lanzamiento.
