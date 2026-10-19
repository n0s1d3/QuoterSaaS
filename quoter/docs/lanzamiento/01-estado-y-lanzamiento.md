# Estado y plan de salida a producción

Fecha: 19 de octubre de 2026, Guatemala. Alcance del 100 %: primera versión comercial estable y operable para clientes, con cobro P2P manual. WhatsApp integrado, enlaces públicos de cotizaciones, facturas y cargos automáticos son fases posteriores.

## Porcentaje actual: 93 %

Mantengo la estimación de la hoja de ruta: el producto ya funciona online y el propietario confirmó el último despliegue. El trabajo pendiente está concentrado en habilitar y demostrar el servicio a terceros, operarlo de forma sostenida y validar que alguien lo compra y renueva. Elaborar este paquete completa la preparación documental; no sustituye su ejecución ni la aprobación de precios/políticas.

| Área | Estado y evidencia | Qué falta |
| --- | --- | --- |
| Producto | Cuentas, negocios separados, catálogo, cotizaciones, cuatro modelos PDF, equipos, planes y recuperación implementados | Validación final con clientes del segmento elegido |
| Calidad | Verificación anterior: 89 unitarias, tipos/lint/build, 20 suites API/navegador y recuperación D1 aprobadas | Registrar aceptación en la versión publicada y resultados de CI de esa versión |
| Seguridad | Auditoría previa reparada; hashes con salt y pepper, permisos de negocio, SQL parametrizado, MFA maestro y controles de archivos | Mantener actualizaciones y revisar incidencias; ninguna prueba acredita invulnerabilidad |
| Despliegue | Cloudflare y acceso online confirmados por el propietario | Ejecutar y registrar `check:production` desde su equipo tras el último despliegue |
| Correo | Verificación de la cuenta propia confirmada | Confirmar dominio/remitente que permita verificar y recuperar cuentas de clientes externos |
| Operación | Respaldo real y ensayo local confirmados | Copia externa cifrada, periodicidad, alertas y ensayo de recuperación publicado controlado |
| Comercial | Plan de distribución, propuesta de precios, procedimientos y manuales preparados | Aprobarlos, definir datos fiscales/canales y publicarlos donde corresponda |
| Piloto | No hay resultados documentados con clientes externos | Completar un ciclo de alta, uso, pago y renovación con pocos negocios |

No se revalidó producción desde este entorno el 19 de octubre: la solicitud anónima de salud falló por red/resolución. Eso limita esta revisión; no demuestra una caída. Las pruebas automatizadas citadas son las de la entrega anterior, no una ejecución nueva.

## Condiciones para abrir el piloto

| Prioridad | Acción | Responsable | Criterio de terminado |
| --- | --- | --- | --- |
| Bloqueante | Verificar un dominio de envío y configurar el remitente | Operador | Tres cuentas propias/controladas de destinatarios distintos reciben verificación y recuperación; no solo el correo de Resend |
| Bloqueante | Validar la app pública | Operador | Matriz de ACCEPTANCE.md con versión, fecha, móvil/escritorio y resultado; sin fallos que impidan trabajar |
| Bloqueante | Preparar respaldo y alerta | Operador | Copia cifrada fuera del equipo; restauración local aprobada; alerta de salud recibida en una prueba controlada |
| Bloqueante | Aprobar precio, cobro, soporte y condiciones | Propietario | Precio final, régimen fiscal revisado, contacto, horario y reglas de devolución comunicados antes del pago |
| Antes de tráfico pagado | Preparar destino de campaña | Marketing | Página comercial o mensaje de bienvenida con demo, precio, límites, prueba de siete días y contacto real |
| Durante piloto | Enseñar y observar uso | Propietario / soporte | 5–10 negocios con consentimiento, primera cotización real o de prueba y seguimiento |
| Antes de apertura general | Ensayar continuidad y cerrar incidencias | Operador | Procedimiento de reemplazo privado validado; incidencias críticas cerradas; conciliación y soporte sostenibles |

Un dominio propio para la app mejora confianza, pero workers.dev puede servir para el piloto. **El dominio verificado para envío de correos sí es una dependencia para captar destinatarios arbitrarios con Resend.** Son decisiones distintas; pueden usar el mismo dominio cuando se compre.

## Secuencia de lanzamiento

Las fechas son objetivos, condicionados a resolver los bloqueos; no compromisos de disponibilidad.

| Periodo | Resultado esperado |
| --- | --- |
| 19–25 oct 2026 | Dominio/remitente, precios/políticas aprobados, pruebas públicas, manuales, copia externa y monitor |
| 26 oct–8 nov | Piloto acompañado de 5–10 negocios; prueba de siete días por negocio, feedback y primer pago |
| 9–18 nov | Ajustes de mensajes/onboarding y primer control comercial de 30 días; ampliar solo si funciona el embudo |
| 19 nov–18 dic | Seguir primeras renovaciones, medir soporte, mantener o pausar publicidad según CAC y uso |
| 19 dic–16 ene 2027 | Escalar el canal ganador con datos de varias cohortes; revisar capacidad y costos reales |

## Criterios de apertura general

1. Todos los bloqueantes anteriores tienen evidencia fechada, no solo una casilla marcada.
2. Al menos 5 negocios completan registro verificado, marca, catálogo, cotización, PDF y respaldo; al menos 3 deciden pagar. Son metas de piloto, no resultados actuales.
3. Ninguna incidencia crítica de pérdida de datos, acceso ajeno, pago aplicado al negocio equivocado o correo inaccesible permanece abierta.
4. Al menos una renovación manual se verifica end-to-end y se comprueba que repetir su referencia no suma meses.
5. Soporte puede atender el volumen; hay una persona responsable de operación y otra vía de contacto si la app cae.
6. La recuperación tiene tiempos observados con volumen representativo. RPO 24 h / RTO 2 h siguen siendo objetivos internos hasta medirlos, no SLA publicado.

El porcentaje puede seguir alrededor de 93 % mientras falten estos puntos. El piloto permite descubrir problemas; llegar a 100 % significa cumplir este alcance de lanzamiento, no dejar de mantener el software.

## Registro de salida

Usar una copia de esta tabla en un registro privado de operación. No incluir contenido de cotizaciones ni claves.

| Campo | Qué registrar |
| --- | --- |
| Versión | Commit desplegado, migración aplicada y fecha Guatemala |
| Correo | Dominio/remitente y resultado de entrega; nunca la clave API |
| Aceptación | Pruebas, responsable, resultado y ticket si falló |
| Recuperación | Fecha del respaldo, identificador privado, ensayo, RPO/RTO observado |
| Cobro | ID de negocio, plan y referencia de recibo conciliada |
| Comercial | Versión de precios/condiciones aceptada y canal de soporte |
| Decisión | Abrir piloto / mantener piloto / abrir general, con responsable |
