# Costos, precios y proceso de cobro

Guatemala, 19 de octubre de 2026. Moneda comercial: GTQ. **Precios de venta propuestos; no están aprobados ni configurados como tarifas de cobro en Quoter.** El código aplica planes/capacidad/vigencia; no calcula el importe pagado por una suscripción.

## Propuesta de planes mensuales

| Plan actual | Precio propuesto/mes | Cotizaciones activas | Catálogo activo | Equipo total, incluido propietario |
| --- | ---: | ---: | ---: | ---: |
| Plan 1 | Q49 | 25 | 15 | 1 |
| Plan 2 | Q89 | 50 | 25 | 3 |
| Plan 3 | Q149 | 100 | 50 | 5 |

Todos incluyen los cuatro modelos PDF, marca y funcionalidades correspondientes a los permisos del usuario. Son cupos de capacidad acumulada, **no paquetes de creación que se reinician cada mes**. También cuentan cotizaciones aceptadas, rechazadas o vencidas fuera de papelera. Invitaciones pendientes reservan plazas; no son 3 o 5 personas adicionales al propietario.

Hay siete días de prueba del Plan 1. Luego hay solo lectura hasta renovar; no hay plan gratuito permanente para clientes ni cargos automáticos. La cuenta maestra es la excepción administrativa permanente. El plan se activa por negocio; una cuenta que participa en varios negocios no compra capacidad compartida entre ellos.

Recomendación inicial: cobrar mes a mes, no ofrecer anualidades, precios vitalicios ni descuentos de upgrades que el sistema no sabe calcular. Validar precio y capacidad con 5–10 negocios. No competir solo por precio: el acompañamiento inicial cuesta tiempo y debe ser sostenible.

Definir antes de cobrar el precio final al público y el régimen tributario con el contador. Para modelar se tratan Q49/Q89/Q149 como importes finales y se permite una reserva hipotética equivalente a IVA incluido del 12 %. **Ese 12 % es una sensibilidad financiera, no una determinación de régimen, tasa aplicable o obligación fiscal de Quoter.** Si el régimen es otro, sustituir el cálculo y los textos comerciales. No sumar impuestos ocultos después de anunciar un precio final.

## Presupuesto de proveedores

No fue posible verificar las tarifas vigentes el 19 de octubre: el acceso a las páginas oficiales devolvió 403 del proxy. Los valores siguientes son **supuestos para presupuestar**, no cotizaciones, contratos ni confirmaciones de precios actuales. Verificar moneda, impuestos, cuota incluida y renovación desde los paneles antes de contratar.

Tipo de cambio de planificación: **Q7.70/USD**, no tipo de cambio oficial del día ni garantía del cargo del banco. Probar también Q7.50 y Q8.00/USD. Usar el tipo efectivo del estado de cuenta al conciliar.

| Rubro | Piloto austero | Operación con correo pagado | Naturaleza y límite |
| --- | ---: | ---: | --- |
| Workers / servicio de ejecución | USD5/mes = Q38.50 | USD5/mes = Q38.50 | Presupuesto base de referencia; D1/CPU/solicitudes pueden tener excedentes |
| Correo Resend | USD0 presupuestado | USD20/mes = Q154.00 | Piloto gratuito solo si el plan contratado y sus límites lo permiten; requiere remitente/dominio válido |
| Dominio | USD15/año / 12 = Q9.63/mes | Q9.63/mes | Reserva estimada; cotizar TLD elegido, compra y renovación. No prueba disponibilidad |
| Copia externa cifrada | USD3/mes = Q23.10 | Q23.10/mes | Reserva estimada de almacenamiento; contratar/configurar aparte |
| Monitor de disponibilidad | Q0 presupuestado | Q0 presupuestado | Solo si se elige una opción gratuita suficiente; alertas aún por configurar |
| Turnstile | Q0 presupuestado | Q0 presupuestado | Confirmar plan y condiciones de la cuenta; no incluye soporte empresarial |
| Total mensual equivalente | **Q71.23** | **Q225.23** | Valores redondeados al final; no incluyen excedentes, impuestos al proveedor ni diferencia cambiaria |

El dominio se paga por adelantado: la reserva anual del ejemplo es Q115.50, no doce cobros de Q9.63. El subdominio workers.dev evita un dominio de app durante el piloto, pero no resuelve por sí solo el dominio de correo de clientes.

Fuentes para **verificar antes de comprar**, sin afirmar consulta exitosa hoy:

- Workers: https://developers.cloudflare.com/workers/platform/pricing/
- D1: https://developers.cloudflare.com/d1/platform/pricing/
- Correo: https://resend.com/pricing
- Turnstile: https://developers.cloudflare.com/turnstile/plans/
- Dominios: cotización del registrador para el nombre y extensión elegidos, incluida renovación.

No trasladar sin revisar las cuotas gratuitas a una cuenta de pago ni presupuestar recursos como ilimitados. PDF se genera en el navegador; no se paga a un servicio externo por cada PDF. Sí se paga el consumo asociado a leer/guardar la cotización y a servir la app.

## Costos que suelen olvidarse

| Rubro | Supuesto editable | Cómo tratarlo |
| --- | --- | --- |
| Marketing | Q600/mes | Gasto de caja; desglose en el plan de marketing |
| Operación del propietario | 3 h/mes × Q40 = Q120 | Respaldo, alertas y revisión de cobros; valoración del tiempo, no un salario ya desembolsado |
| Trabajo comercial/contenido | 8 h/mes × Q40 = Q320 | Aparte de los Q600 de caja; ajustar si ya se pagó dentro de las piezas de campaña para no duplicarlo |
| Soporte recurrente | 15 min/negocio pagador/mes × Q40/h = Q10 | Valoración variable por negocio; validar con tiempos reales |
| Conciliación P2P | 3 min/pago × Q40/h = Q2 | Un pago mensual por negocio; más pagos significan más trabajo |
| Onboarding inicial | 20 min/alta asistida × Q40/h = Q13.33 | Costo de una sola vez; también los negocios que prueban y no pagan consumen asistencia |
| Comisión bancaria/procesador | Q0 en el ejemplo | Supuesto, no garantía; introducir comisión real fija/porcentual, incluidos impuestos del proveedor si corresponden |
| Contabilidad, formalización, facturación fiscal, soporte legal | Sin cotizar | Agregarlos al presupuesto antes de la apertura; no están incluidos en los resultados de abajo |
| Desarrollo ya invertido / mantenimiento futuro | Sin valorar | El ejemplo no recupera inversión histórica ni presupuesta todas las horas de desarrollo |

No son «ganancias netas» mientras falten impuestos sobre renta, obligaciones de personal y gastos no cotizados. El dinero de las cotizaciones de los negocios clientes no es ingreso de Quoter; solo sus suscripciones lo son.

## Ejemplo financiero mensual estable

Supuestos: 70 % de negocios en Plan 1, 20 % en Plan 2 y 10 % en Plan 3; ticket promedio ponderado Q67. Infraestructura Q225.23; marketing Q600; tiempo fijo valorado Q440; soporte y conciliación Q12 por negocio pagador; comisión externa 0; sin nuevas altas asistidas ni soporte de pruebas en esta tabla. El escenario fiscal de sensibilidad reserva 12/112 del cobro final; no descuenta créditos fiscales ni ISR.

Fórmulas:

- Cobro nominal mensual = negocios pagadores × Q67.
- Ingreso tras reserva tributaria hipotética = cobro nominal / 1.12.
- Efectivo antes de remunerar al propietario = ingreso tras reserva − infraestructura − marketing − comisiones externas.
- Resultado económico = efectivo anterior − Q440 de tiempo fijo − Q12 por negocio − tiempo adicional de onboarding/pruebas.
- Contribución media por negocio = 67 / 1.12 − 12 = Q47.82, antes de comisiones externas y adquisición.

| Pagadores | Cobrado | Tras reserva | Infra. | Marketing | Caja antes de tiempo | Tiempo | Resultado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | Q670.00 | Q598.21 | Q225.23 | Q600.00 | Q-227.01 | Q560.00 | Q-787.01 |
| 25 | Q1,675.00 | Q1,495.54 | Q225.23 | Q600.00 | Q670.31 | Q740.00 | Q-69.69 |
| 50 | Q3,350.00 | Q2,991.07 | Q225.23 | Q600.00 | Q2,165.85 | Q1,040.00 | Q1,125.85 |
| 100 | Q6,700.00 | Q5,982.14 | Q225.23 | Q600.00 | Q5,156.92 | Q1,640.00 | Q3,516.92 |

La mezcla es una hipótesis de cartera, por eso puede representar negocios fraccionarios en escenarios pequeños; los cobros reales se calculan sumando las suscripciones existentes. El mes cobrado por adelantado y el MRR reconocido no siempre coinciden con esta fotografía estable.

Punto de equilibrio del escenario base: **14 negocios pagadores para cubrir caja antes de remunerar al propietario**, o **27 para cubrir también el tiempo recurrente valorado**. Sin reserva tributaria hipotética: 13 y 24 respectivamente. No incluyen nuevas altas asistidas ni los rubros sin cotizar. No afirmar rentabilidad desde el primer cliente porque la factura de hosting sea pequeña.

Cada Q100 adicional de gasto fijo exige aproximadamente tres negocios más con la contribución de Q47.82. La calculadora permite cambiar presupuesto, precios, mezcla, tipo de cambio, impuestos de sensibilidad, comisiones y tiempo. Es un modelo; no está conectado a la app ni sustituye contabilidad.

## Escala y almacenamiento

El uso de D1 crece con clientes, catálogo, cotizaciones, papelera e historial. El logo puede ocupar hasta aproximadamente 400,000 caracteres por copia de marca; cien cotizaciones con copias grandes se acercan a 40 MB por negocio solo en snapshots. Cien negocios en ese caso se acercan a 4 GB antes del resto de datos e índices. El JSON de exportación deduplica imágenes, pero eso no significa que D1 deduplique los snapshots guardados.

Revisar tamaño real, lecturas/escrituras, CPU, correos por día/mes y costos a 10, 25, 50 y 100 negocios. Tener papelera o catálogo archivado no implica almacenamiento gratis ni limpieza automática. Revisar límites vigentes por base/cuenta y prever cambios de arquitectura antes de alcanzarlos; los presupuestos anteriores no garantizan servicio para cualquier volumen.

## Proceso P2P recomendado

1. El propietario del negocio abre **Plan y uso** y comunica su ID de negocio y plan deseado al canal autorizado.
2. El vendedor comunica precio final aprobado, datos de pago, vencimiento, tiempo de activación y condiciones. Los datos bancarios/beneficiario aún deben definirse; no enviar un formulario que pida contraseña de Quoter.
3. El cliente realiza el pago externo y comunica la referencia. Una captura sola no acredita fondos recibidos.
4. El administrador verifica el abono y su importe en el banco/proveedor. Mantiene un libro de suscripciones propio y privado, separado de las cotizaciones del cliente.
5. Registra el mes en **Administración → Negocios → Activar o renovar plan**, con ID, plan, referencia única y su contraseña administrativa.
6. Confirma el resultado y la nueva vigencia; el cliente revisa **Plan y uso**. Si falta actualizar la pantalla, puede recargarla.
7. Emite el comprobante/factura del servicio SaaS por el medio legal aplicable, externo a Quoter, según asesoría contable.

Objetivo de atención propuesto: activación dentro de un día hábil tras verificación del abono y datos completos; no publicarlo hasta aprobar horario y responsable. La app no comprueba importes bancarios ni envía este comprobante automáticamente.

## Reglas que ya aplica el sistema

- Un registro de pago agrega **un mes calendario**, no necesariamente treinta días. En fin de mes ajusta al último día válido.
- Si aún queda prueba o vigencia pagada, suma el mes desde el vencimiento que corresponda y conserva el tiempo. Si está vencido, parte del momento de activación.
- Repetir exactamente la misma referencia para el mismo negocio/plan no vuelve a sumar un mes. Reutilizarla para otro negocio/plan se rechaza. Conservar una referencia canónica sin datos bancarios completos; un cambio manual de letras/prefijo puede convertirla en otra referencia y duplicar un registro.
- Una ampliación aplica el plan superior de inmediato y agrega el mes completo. No hay cálculo de diferencias ni prorrateo automático. Ejemplo comercial propuesto: si vence el 20 de noviembre y el 25 de octubre paga un mes del Plan 2, el nuevo vencimiento es el 20 de diciembre y los cupos superiores aplican ya. Confirmar fechas mostradas por la app.
- Una reducción de un plan pagado vigente se rechaza hasta que venza; no hay programación anticipada. Tras el vencimiento conserva datos; si excede los cupos, bloquea nuevas altas de ese tipo, sin borrar lo existente.
- Renovar no levanta automáticamente una suspensión administrativa ni reactiva cuentas deshabilitadas. Resolver primero el motivo y habilitar explícitamente si corresponde.
- La prueba y el vencimiento se controlan por servidor. No se conceden meses cambiando fechas del dispositivo.
- No hay botón de reembolso ni de anular pagos en el panel; una corrección requiere procedimiento controlado del operador y verificación posterior. No registrar otra referencia «para arreglar» una activación errónea.

## Libro de cobros externo

Campos mínimos: ID de negocio, fecha del abono y de revisión, plan, precio final acordado, moneda, importe verificado, medio, referencia bancaria protegida, referencia canónica usada en Quoter, identificador de comprobante fiscal, inicio/fin del periodo y responsable. Añadir incidencia/reembolso si existe. Restringir acceso; no almacenar contraseñas, códigos MFA ni contenido de cotizaciones de clientes.

Antes de lanzar se debe acordar el tratamiento de pagos parciales, excedentes, referencias de un pago que cubre varios negocios, devoluciones y errores de asignación. Hasta tener una regla implementable, preferir un pago identificable por negocio y periodo; no improvisar fraccionamientos de referencias que impidan conciliar.
