# Estado y camino a la primera publicación

Actualizado el 14 de octubre de 2026. Avance estimado: **87 %** hacia una primera versión online, revisada, funcional y utilizable por clientes. Es una estimación de preparación, no una cobertura de pruebas ni una garantía de que queda un 17 % exacto del tiempo. El segundo factor llevó la estimación al 83 %. El hash versionado de 600.000 iteraciones, los controles de logos y la integración antiabuso la llevan aproximadamente al 87 %. Todavía deben validarse estos controles y servicios en producción.

## Disponible y validado localmente

- Cuentas, confirmación de contraseña, verificación de correo y recuperación de acceso.
- Negocios separados, roles, invitaciones, acceso de solo lectura por vencimiento y administración maestra con privacidad limitada.
- Cotizaciones, catálogo, clientes integrados, totales calculados por servidor, estados, edición, duplicación y papelera.
- PDF con membrete y marca, con notas internas excluidas; cambio de marca por cotización.
- Resumen compacto, gráficos, recordatorios y vistas responsive.
- Respaldos y restauración sin duplicación de cotizaciones/clientes, validación e historial.
- Tres planes, cuotas, prueba de siete días, meses de vigencia y renovación P2P manual por referencia única.
- Revisión de seguridad, límites de solicitudes, sesiones/roles comprobados durante escrituras, encabezados de navegador y segundo factor obligatorio para el panel maestro.
- Hashes versionados de 600.000 iteraciones con actualización de cuentas antiguas, validación de archivos de logo y expansión PNG limitada.
- Integración Turnstile para registro/recuperación y presupuesto diario de registros; el servicio real aún necesita claves y hostname.

## Falta para declarar 100 %

| Área | Trabajo pendiente | Qué demuestra que está lista |
| --- | --- | --- |
| Seguridad | Configurar Turnstile real, medir coste del hash en Workers publicado y verificar el conjunto con HTTPS. Los controles ya están implementados y probados localmente. | Pruebas de regresión y rendimiento en el runtime elegido; solicitudes maliciosas rechazadas sin impedir los flujos normales. |
| Infraestructura | Elegir dominio, configurar HTTPS, D1 remota, secretos y despliegue del Worker/assets. | La URL pública funciona sin servidores de desarrollo ni credenciales expuestas. |
| Correo real | Configurar Resend, remitente verificado y APP_URL. | Una cuenta de prueba recibe verificación y recuperación reales y completa ambos flujos desde la URL pública. |
| Operación comercial | Definir precios e instrucciones P2P, responsables y procedimiento para confirmar pagos/renovar planes. | Un cliente entiende cómo pagar y se verifica la activación de un mes, sin duplicarla al repetir una referencia. |
| Operación técnica | Respaldos D1, recuperación probada, registros/alertas, custodia de secretos y documentación de privacidad/soporte. | Se puede restaurar el servicio y diagnosticar fallas respetando los datos de los negocios. |
| Validación final | Prueba integral publicada en móvil/escritorio y con negocios separados; piloto con clientes. | Registro, correo, cotización, PDF, pagos manuales, límites y vencimientos funcionan en el entorno público. |

Orden recomendado: configurar los servicios reales y preparar procedimientos; configurar dominio/correo cuando se decida; desplegar y realizar el piloto. La publicación se mantiene pendiente por decisión del propietario.

La cuenta maestra todavía debe inscribir su propio autenticador; el desarrollo no sustituye esa acción personal. Los tests usan cuentas aisladas. No se han configurado servicios remotos ni enviado mensajes en esta etapa.

Los enlaces públicos, WhatsApp y conversión a facturas siguen al final de la lista. No forman parte del criterio del 100 % para este primer lanzamiento de cotizaciones con PDF y ventas P2P manuales. Si se incorporan al alcance inicial, la estimación debe recalcularse. El cobro automático también se mantiene fuera del alcance inicial.
