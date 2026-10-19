# Costos, periodos, descuentos y cobro

Guatemala, 19 de octubre de 2026. Base mensual en GTQ: Q49 / Q89 / Q149. Los periodos contratables de esta versión son **1, 3, 6 y 12 meses**, con descuentos de **0, 5, 10 y 15 %** respectivamente. Venta por negocio con usuarios incluidos; pago anticipado del periodo y verificación P2P manual. No hay cargos automáticos.

## Precios del periodo

| Plan | 1 mes, 0 % | 3 meses, 5 % | 6 meses, 10 % | 12 meses, 15 % |
| --- | ---: | ---: | ---: | ---: |
| Plan 1 | Q49.00 | Q139.65 | Q264.60 | Q499.80 |
| Plan 2 | Q89.00 | Q253.65 | Q480.60 | Q907.80 |
| Plan 3 | Q149.00 | Q424.65 | Q804.60 | Q1,519.80 |

Son importes totales del periodo, no precios mensuales ni importes por cada integrante. Ejemplo Plan 1 anual: Q49 × 12 = Q588; descuento Q88.20; pago Q499.80; equivalente Q41.65/mes. Plan 2 anual: Q907.80, equivalente Q75.65/mes. Plan 3 anual: Q1,519.80, equivalente Q126.65/mes. El redondeo se hace a centavos sobre el total.

Los planes conservan **25/15/1, 50/25/3 y 100/50/5** cotizaciones activas / catálogo activo / equipo total incluido propietario. Comprar doce meses no multiplica cupos ni concede una licencia perpetua. Las cotizaciones aceptadas, rechazadas y vencidas fuera de papelera también consumen capacidad, sin reinicio mensual.

La prueba sigue siendo de siete días del Plan 1. Mantener opción mensual reduce el pago inicial de una persona que aún está evaluando el producto. El descuento remunera compromiso y menor frecuencia de conciliación; no garantiza más aceptación ni renovación.

Los importes están definidos en `src/lib/billing.ts` y se muestran en Plan y uso y Administración. El administrador registra plan, periodo, referencia y tarifa calculada por servidor; **la app no comprueba un abono bancario ni emite el comprobante fiscal del SaaS**. La migración 0022 mantiene activaciones anteriores como un mes, sin inventar sus importes históricos. Confirmar antes de ofrecer al público el tratamiento tributario y condiciones legales; no agregar cargos ocultos después de comunicar el precio final.

## Qué significaban los 51 clientes

La cifra anterior suponía toda la cartera en el básico anual de Q500 y gastos fijos altos, y conservaba Q2 de conciliación cada mes aunque el pago fuera anual. Este recálculo reparte ese trabajo entre los meses contratados: Q2 por pago anual equivale a Q0.17 al mes. Con Q499.80/año, sin reserva de devolución y el mismo gasto fijo alto, el umbral ronda 47 negocios básicos; con reserva hipotética de 3 %, ronda 49. No es una meta de captación demostrada.

La palanca principal al iniciar es el gasto fijo. Con Q300 de captación, siete horas fijas valoradas al mes y mezcla de planes, el umbral anual pasa a 17–21 negocios según correo gratuito elegible o pagado. Si **todos** compran solo el básico anual, son 26–32. La mezcla 70/20/10 es una hipótesis, no una venta de planes superiores ya conseguida.

Descontar más reduce la contribución; solo ayuda si mejora suficientemente conversión, retención o costo de cobro. No bajar precios para ocultar un gasto comercial que todavía no produce clientes.

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


## Presupuestos revisados

Todos son presupuestos de referencia: tarifas vigentes de proveedores bloqueadas por red, tipo de cambio de planificación Q7.70/USD e impuestos aún por confirmar. «Correo gratuito» solo es válido si el plan contratado permite el volumen con dominio/remitente verificados; una cuenta de prueba restringida a su propio destinatario no sirve para lanzar a terceros.

| Partida | Piloto austero | Correo pagado | Escenario anterior |
| --- | ---: | ---: | ---: |
| Infraestructura mensual equivalente | Q71.23 | Q225.23 | Q225.23 |
| Captación mensual, dentro del rango elegido | Q300 | Q300 | Q600 |
| Operación fija valorada | 3 h × Q40 = Q120 | Q120 | Q120 |
| Comercial/contenido fijo valorado | 4 h × Q40 = Q160 | Q160 | 8 h × Q40 = Q320 |
| Total fijo, incluyendo tiempo | Q651.23 | Q805.23 | Q1,265.23 |

No confundir tiempo valorado del propietario con dinero ya desembolsado. No duplicar el costo de contenido si se paga dentro del presupuesto de campaña. Añadir contabilidad, formalización, mantenimiento/desarrollo, obligaciones fiscales y otros gastos cuando se coticen. Estos modelos no acreditan utilidad neta fiscal.

Variable por negocio: soporte de quince minutos/mes × Q40/h = Q10/mes, más tres minutos × Q40/h = Q2 por **cada pago**. Al distribuirlo entre 1/3/6/12 meses resulta Q12 / Q10.67 / Q10.33 / Q10.17 al mes respectivamente. Un alta/prueba asistida cuesta veinte minutos = Q13.33 una sola vez; también consume tiempo si no paga. Las entrevistas iniciales son trabajo adicional que debe presupuestarse.

## Punto de equilibrio por periodo

Mezcla hipotética: 70 % Plan 1, 20 % Plan 2 y 10 % Plan 3. Reserva por devolución del **3 % de ingresos**, no tasa observada. Sensibilidad tributaria: precio final / 1.12, sin crédito fiscal ni ISR; no determina el régimen de Quoter. Sin comisiones externas ni nuevas altas en la tabla. Equilibrio de caja excluye remunerar al propietario; equilibrio con tiempo sí incluye su trabajo recurrente valorado.

| Escenario | Periodo | Ticket mensual equivalente | Contribución mensual | Equilibrio de caja | Equilibrio con tiempo |
| --- | --- | ---: | ---: | ---: | ---: |
| Anterior | 1 mes | Q67.00 | Q46.03 | 15 | 28 |
| Anterior | 3 meses | Q63.65 | Q44.46 | 15 | 29 |
| Anterior | 6 meses | Q60.30 | Q41.89 | 16 | 31 |
| Anterior | 12 meses | Q56.95 | Q39.16 | 17 | 33 |
| Piloto austero | 1 mes | Q67.00 | Q46.03 | 7 | 15 |
| Piloto austero | 3 meses | Q63.65 | Q44.46 | 7 | 15 |
| Piloto austero | 6 meses | Q60.30 | Q41.89 | 8 | 16 |
| Piloto austero | 12 meses | Q56.95 | Q39.16 | 8 | 17 |
| Correo pagado | 1 mes | Q67.00 | Q46.03 | 10 | 18 |
| Correo pagado | 3 meses | Q63.65 | Q44.46 | 10 | 19 |
| Correo pagado | 6 meses | Q60.30 | Q41.89 | 11 | 20 |
| Correo pagado | 12 meses | Q56.95 | Q39.16 | 11 | 21 |

Las cifras son equivalentes mensuales de una cartera estable, no una predicción de caja de cada mes. Un pago anual concentra efectivo al inicio y exige financiar doce meses. No sumar ese pago entero a «ganancia del mes».

Fórmulas: ingreso nominal equivalente = total contratado / meses; ingreso tras reservas = nominal × (1 − devolución) / (1 + impuesto hipotético); contribución = ingreso tras reservas − soporte mensual − conciliación por pago/meses − comisiones. Equilibrio = redondear hacia arriba costo fijo / contribución. Si la contribución es cero o negativa no existe equilibrio con esos supuestos.

## Ejemplo de cartera anual austera

| Negocios | Cobro inicial de la cohorte | Ingreso nominal mensual equivalente | Resultado económico mensual equivalente |
| --- | ---: | ---: | ---: |
| 5 | Q3,417.00 | Q284.75 | Q-455.44 |
| 10 | Q6,834.00 | Q569.50 | Q-259.66 |
| 15 | Q10,251.00 | Q854.25 | Q-63.88 |
| 20 | Q13,668.00 | Q1,139.00 | Q131.90 |
| 30 | Q20,502.00 | Q1,708.50 | Q523.46 |

Se usan los mismos supuestos: Q651.23 fijos con tiempo, reserva del 3 %, impuesto de sensibilidad 12 % y conciliación repartida. El cobro inicial es bruto y solo ocurre si todos compran ese día; reservar impuestos/devoluciones y costo de los meses restantes. No representa ingreso recurrente de un mes ni demuestra que se conseguirán esos clientes.

## Presupuesto del piloto de tres meses

Con USD5 de ejecución, USD3 de copia externa y Q300 de captación al mes, más dominio USD15 pagado de una vez: **Q1,200.30 de caja** durante tres meses si el correo gratuito realmente es suficiente. Con la reserva de USD20/mes para correo pagado: **Q1,662.30**. Una contingencia de 10 % los lleva a Q1,320.33 / Q1,828.53. No incluyen gastos no cotizados ni el tiempo del propietario. Estos totales pagan el dominio anual de una vez: no lo suman de nuevo como cuota mensual.

Una etapa de aprendizaje puede producir pérdidas. La meta inicial es demostrar uso y tres pagos dentro de un presupuesto acotado, no contratar gasto de operación plena esperando 51 clientes inmediatos.

## Escala y almacenamiento

Snapshots de marca y logos, cotizaciones, clientes, papelera e historial consumen D1 aunque no ocupen cupos activos. Un logo de aproximadamente 400,000 caracteres en cien documentos puede acercarse a 40 MB por negocio, antes del resto de información e índices. El JSON deduplica imágenes al exportar; eso no deduplica automáticamente la base.

Medir CPU, consultas, tamaño, correo y soporte a 10/25/50/100 negocios. Confirmar límites/excedentes del proveedor; el presupuesto fijo no garantiza cualquier volumen. Los precios más largos no multiplican capacidad ni eliminan costos de conservar datos.

## Cobro y activación

1. El propietario comunica ID de negocio, plan y periodo elegido.
2. El vendedor confirma importe total final, medio, condiciones y atención aprobada.
3. Se verifica externamente abono e importe. Una captura no acredita fondos por sí sola.
4. Administración → Negocios → Activar o renovar plan: elegir plan y **Periodo contratado**, escribir referencia canónica, confirmar contraseña y registrar.
5. Revisar nueva vigencia y tarifa registrada; el cliente confirma Plan y uso. Emitir comprobante fiscal por el medio externo que corresponda al régimen confirmado.

La API calcula la tarifa del periodo; ignora importes enviados por el navegador. Una referencia repetida solo se considera el mismo pago si coinciden negocio, plan y periodo; cambiar el periodo con la misma referencia se rechaza. No registrar doce referencias para una anualidad.

El periodo suma meses calendario desde la vigencia pendiente o desde ahora si venció, con ajuste al último día válido del mes destino. Enero 31 + tres meses llega a abril 30 en una operación. Febrero 29 + doce meses ajusta a febrero 28 del año siguiente. Los meses no son paquetes fijos de treinta días.

Se mantienen solo lectura al vencer, control de suspensiones separado del pago y prohibición de reducir capacidad mientras hay plan pagado vigente. Esta entrega mantiene la regla existente de ampliación: cupos superiores inmediatos y conservación del tiempo pendiente, sin crédito ni prorrateo automáticos. Eso puede conceder mucho tiempo de un plan superior al ampliar después de comprar un anual básico; revisar esa política antes de comercializar cambios entre niveles. La decisión sobre crédito proporcional sigue pendiente; no se implementa una política nueva sin definirla. El tratamiento de ampliaciones se debe explicar antes de cobrar; no confundirlo con una devolución automática. No existe reembolso bancario ni factura FEL dentro de este flujo.

## Libro de cobros y devoluciones

Registrar por fuera, con acceso restringido: ID de negocio, plan, periodo, importe final acordado/verificado, moneda/medio, referencia bancaria protegida y referencia canónica de Quoter, comprobante, inicio/fin y responsable. El panel maestro no expone contenido privado de cotizaciones.

Definir política de devolución aplicable y revisión contable antes de prometer garantías. La reserva financiera del 3 % no crea un botón de devolución ni significa que los competidores tengan esa tasa. Separar tasa por contratos, tasa por importe y abandono/renovación; pueden ser distintas. Una devolución externa necesita conciliación y, si corresponde, corrección controlada de vigencia; no agregar otra activación para compensar un error.

Contemplar comisiones no recuperables, impuestos, cancelación parcial y atención de la incidencia. No se presupuestan como cero por no estar integrados en la app.
