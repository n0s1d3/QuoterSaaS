# Estado y camino a la primera publicación

Actualizado el 19 de octubre de 2026. Avance estimado: **93 %** hacia una versión online, revisada y lista para clientes. Es una estimación de preparación, no cobertura de pruebas ni porcentaje del tiempo restante. El propietario confirmó despliegue, acceso online y pruebas básicas satisfactorias. Cloudflare D1, secretos, Turnstile y correo de la cuenta propia ya se configuraron; falta completar la aceptación pública y la preparación operativa/comercial. Los 19 hallazgos de código de la auditoría ya tienen reparación o un procedimiento concreto; ver REMEDIATION.md para la evidencia y los límites externos. La cifra no aumenta automáticamente por una verificación exclusivamente local.

## Disponible y validado localmente

- Cuentas, confirmación de contraseña, verificación de correo y recuperación de acceso.
- Negocios separados, roles, invitaciones, acceso de solo lectura por vencimiento y administración maestra con privacidad limitada.
- Cotizaciones, catálogo, clientes integrados, totales calculados por servidor, estados, edición, duplicación y papelera.
- PDF con cuatro modelos, selector, vista previa y membrete de marca; notas internas excluidas. Modelo predeterminado por negocio y cambio de modelo/marca por cotización.
- Resumen compacto, gráficos, recordatorios y vistas responsive.
- Respaldos y restauración sin duplicación de cotizaciones/clientes, validación e historial.
- Tres planes, cuotas, prueba de siete días, periodos 1/3/6/12 con descuentos y renovación P2P manual por referencia única.
- Revisión de seguridad, límites de solicitudes, sesiones/roles comprobados durante escrituras, encabezados de navegador y segundo factor obligatorio para el panel maestro.
- Hashes versionados con PBKDF2 nativo de 100.000 iteraciones y pepper independiente, con compatibilidad de formatos previos según runtime; validación de archivos de logo y expansión PNG limitada. El uso de 600.000 iteraciones en una sola llamada falló durante el registro publicado; véase PASSWORD_SECURITY.md.
- Integración Turnstile para registro/recuperación y presupuesto diario de registros; claves y hostname configurados por el propietario.

## Falta para declarar 100 %

| Área | Trabajo pendiente | Evidencia necesaria |
| --- | --- | --- |
| Aceptación publicada | Completar la matriz de ACCEPTANCE.md con cuentas controladas | MFA, recuperación, aislamiento, PDF, cuotas y renovaciones verificados en HTTPS |
| Correo a clientes | Dominio de envío verificado y remitente autorizado | Verificación/recuperación entregadas a destinatarios del piloto; Resend de prueba solo cubre la cuenta propia |
| Operación | Respaldo real y ensayo local confirmados; falta copia externa, monitor con alertas y ensayo de reemplazo publicado | Procedimiento de OPERATIONS.md ejecutado con producción; custodia separada de secretos |
| Comercial | Marketing, precios propuestos, procedimientos y manuales preparados; faltan aprobación y publicación de precios, soporte y privacidad | Pago y renovación entendibles, referencia repetida sin doble activación |
| Piloto | Usuarios iniciales y revisión de incidencias | Flujos completos sin fallos pendientes que impidan trabajar |

La recuperación D1 tiene respaldo cifrado, ensayo aislado, procedimiento ejecutable de reemplazo en una D1 nueva y modo mantenimiento. El respaldo real y su ensayo local fueron confirmados por el propietario; no se ejecutó la sustitución remota. La comprobación pública es de solo lectura. Estas herramientas no implican que los respaldos diarios, el monitoreo externo o el ensayo de producción ya estén operando.

Ver [OPERATIONS.md](OPERATIONS.md) y [ACCEPTANCE.md](ACCEPTANCE.md). Los enlaces públicos, WhatsApp, conversión a facturas y cobro automático siguen al final de la lista, fuera del alcance de este primer lanzamiento.

## Preparación comercial y formación

Se preparó un [paquete de lanzamiento](docs/lanzamiento/README.md) para Guatemala, cobros GTQ y presupuesto comercial de Q300–Q1,000/mes. Incluye propuesta de Q600 de campaña y precios por validar, costos editables, manuales separados de usuario/propietario/maestro/operador y material de capacitación. Es documentación y planificación; no se ejecutaron campañas, altas de proveedores ni cambios de tarifas/cobros. La estimación se mantiene en 93 % hasta cerrar la aceptación pública y los pendientes operativos/comerciales.

Actualización de periodos: descuentos 5/10/15 % por 3/6/12 meses a partir de Q49/Q89/Q149 mensuales por negocio. El modelo austero recomienda Q300 de captación y la ampliación incluye estudio preliminar con fuentes oficiales consultadas, límites de investigación y escenarios de conversión/devolución. Requiere migración 0022 y despliegue; no se ejecutaron campañas ni cobros reales.
