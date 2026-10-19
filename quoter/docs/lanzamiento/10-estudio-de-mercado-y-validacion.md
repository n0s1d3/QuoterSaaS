# Estudio de competencia, viabilidad y validación comercial

Guatemala, 19 de octubre de 2026. Estudio preliminar de escritorio con fuentes identificadas, análisis del producto actual y escenarios financieros. **No incluye entrevistas realizadas, ventas observadas, una encuesta representativa ni tasas privadas de competidores.** Sirve para decidir una prueba comercial; todavía no demuestra ajuste producto–mercado.

## 1. Conclusión para decidir

Existe una categoría competida de herramientas de cotizaciones y facturación, incluyendo opciones autohospedadas con muchas funciones. Quoter no puede basar su atractivo únicamente en «generar un PDF» o en ser más barato. La hipótesis defendible para probar es: servicio alojado, en español, GTQ, sencillo desde móvil y acompañado para pequeños instaladores/contratistas que hoy reutilizan precios manualmente.

**Hay cabida plausible en un nicho; no hay evidencia todavía para afirmar demanda pagada suficiente en Guatemala.** La ampliación de plan actual conserva tiempo pendiente sin recalcular automáticamente el valor del saldo; con anualidades puede regalar capacidad superior y requiere una decisión comercial explícita antes de ofrecer cambios entre niveles. El siguiente gasto debe comprar aprendizaje: 20 entrevistas, 5–10 pruebas acompañadas y primeras renovaciones. No se necesitan 51 clientes antes de comenzar, pero tampoco se debe confundir cinco pagos con un negocio sostenible.

Reducir publicidad y horas fijas baja el punto de equilibrio de la etapa inicial. Bajar el precio, aislado de una mejora de conversión/retención, reduce la contribución y exige más negocios. Mantener mensual junto a 3/6/12 meses permite probar valor sin exigir Q499.80 de entrada a un negocio que aún no confía en el servicio.

## 2. Cómo se obtuvieron los datos

Las páginas de precios de Zoho Invoice, Invoice Ninja, Alegra, Better Proposals, Qwilr, Holded y Guatefacturas no se pudieron consultar por el bloqueo 403 del proxy. También fallaron la página de informes de retención de ChartMogul y las páginas de precios de Cloudflare/Resend. **No se atribuyen precios actuales ni tasas comerciales a esas páginas.** Las direcciones se conservan al final para validación posterior.

Sí se accedió a documentación oficial publicada en GitHub, mediante lectura de repositorios sin ejecutar su código. Se fijan los commits para que los hallazgos sean auditables. Lo observado en un README es lo declarado por el proveedor, no una prueba funcional independiente. No se usaron estrellas, descargas o seguidores como número de compradores o tasa de aceptación.

## 3. Competidores con documentación consultada

| Alternativa | Hechos publicados que se pudieron verificar | Precio verificado y comparación correcta | Implicación para Quoter |
| --- | --- | --- | --- |
| Invoice Ninja | Ofrece SaaS alojado y autohospedaje; el README declara funciones Pro/Enterprise en el código disponible | El README publica **USD40/año para quitar su marca en la versión autohospedada**. A Q7.70/USD son Q308/año. No es el precio del SaaS alojado ni incluye servidor/operación | Competidor con alcance amplio. Quoter debe demostrar conveniencia y acompañamiento; no presentarse como superior en funciones |
| InvoicePlane | Se describe como aplicación libre autohospedada; declara cotizaciones/facturas, clientes/productos, pagos, plantillas y reportes | No se verificó un precio de servicio alojado. El costo de instalar, alojar, actualizar y respaldar sigue existiendo | Para un comprador técnico es un sustituto fuerte; para alguien que no quiere instalar, el servicio gestionado puede aportar valor |
| InvoiceShelf, rama estable 2.x | README estable: facturas y estimaciones, pagos y gastos; licencia AGPLv3 | No se verificó tarifa SaaS alojada. No equiparar código disponible con costo operativo cero | Refuerza que cotizar y producir PDF no son diferenciadores únicos |

Fuentes efectivamente leídas:

- Invoice Ninja, README, commit `15ea35ea63f367eba33c04b7acd9ab1227853537` (2026-10-18): https://github.com/invoiceninja/invoiceninja/blob/15ea35ea63f367eba33c04b7acd9ab1227853537/README.md — distingue alojado/autohospedado y publica USD40 de licencia white-label. No se instalaron sus productos.
- InvoicePlane, README, commit `cee512f0dec672fcecec01150e374148c2ac5fa5` (2026-10-18): https://github.com/InvoicePlane/InvoicePlane/blob/cee512f0dec672fcecec01150e374148c2ac5fa5/README.md — secciones de descripción y características.
- InvoiceShelf, README estable 2.x, commit `0287adf6472dd4fe0f6f731c966afcd685086bdb` (2026-09-25): https://github.com/InvoiceShelf/InvoiceShelf/blob/0287adf6472dd4fe0f6f731c966afcd685086bdb/README.md.
- Se revisó además el README de InvoiceShelf en `650bd3bb105f3993a914303a9a767becf8ab804e`: advierte que 3.x es alpha. Por eso no se atribuyeron sus funciones avanzadas anunciadas a la rama estable ni se la trató como producción equivalente.

El importe de USD40 es una declaración documentada de licencia autohospedada, no una cotización fiscal/checkout verificada hoy. Mantener la distinción al enseñarlo al vendedor.

## 4. Lista de comparación pendiente

| Producto / sustituto | Qué investigar al obtener acceso | Pregunta para el comprador |
| --- | --- | --- |
| Zoho Invoice | Oferta vigente, cotizaciones, límites, moneda/idioma, usuarios y condiciones | ¿La solución general disponible ya resuelve el trabajo sin ayuda? |
| Alegra Guatemala | Precio final, cotizaciones, alcance tributario/local y usuarios por plan | ¿Necesita facturación fiscal/contabilidad además de cotizar? |
| Guatefacturas u otro proveedor local FEL | Cotizaciones incluidas, costo y requisitos fiscales verificados | ¿Busca un cotizador o un proveedor fiscal? |
| Better Proposals / Qwilr | Precio, pago por usuario, propuestas interactivas, aceptación e integraciones | ¿Necesita enlaces/aceptación digital que Quoter todavía no ofrece? |
| Holded | Precio, alcance de gestión y adecuación local | ¿El alcance extra justifica complejidad y costo para este negocio? |
| Word / Excel / plantillas / mensajes | Tiempo real de preparar, corregir y encontrar propuestas | ¿El costo de cambiar su hábito vale Q49/mes? |

No se muestran importes no leídos ni se afirma compatibilidad FEL de ninguna alternativa sin verificación. Quoter actualmente **no emite facturas/FEL** y no debe venderse como reemplazo de esa obligación. Un prospecto cuyo requisito imprescindible sea factura fiscal o aceptación por enlace no es el mejor piloto para esta versión.

## 5. Diferenciación que debe probarse

| Hipótesis | Cómo comprobarla | Qué no afirmar |
| --- | --- | --- |
| Menos esfuerzo en cotizaciones repetidas | Medir el mismo caso antes/después con tres tarifas guardadas, sin exigir datos privados | «Ahorra 80 %» sin medición |
| Mejor uso desde teléfono | Observar completar un PDF sin intervención del instructor | «Más fácil que todos los competidores» |
| Acompañamiento cercano | Medir tiempo/resolución y disposición a pagar | Soporte 24/7 o ilimitado sin capacidad |
| Documentos profesionales con marca | Pedir al comprador que compare formatos con sus criterios | Que un diseño por sí solo aumenta ventas |
| Plan predecible en GTQ | Preguntar si entiende precio final, capacidad y renovación | Que 25 cotizaciones significa 25 nuevas cada mes |

Riesgo de producto: los límites activos son acumulados y las cotizaciones aceptadas/rechazadas también cuentan. Un negocio que quiere conservar mucho histórico puede agotar Plan 1 pronto. Observarlo en el piloto y revisar capacidad si impide retención; no recomendar borrar histórico para sostener el precio.

## 6. «Aceptación» tiene varios significados

- Conversión de prueba a pago: negocios que pagan / negocios de esa cohorte cuya prueba ya terminó.
- Activación de producto: negocios con correo verificado, marca y primer PDF / negocios registrados verificados.
- Conversión comercial de las cotizaciones del cliente: propuestas aceptadas / propuestas presentadas. Es otro indicador; Quoter no debe usar los datos privados de esos negocios para su marketing.
- Renovación: contratos que se renuevan / contratos a los que ya les correspondía renovar. Un contrato anual comprado este mes no aporta evidencia de renovación anual.
- Devolución por cantidad: contratos pagados con devolución / contratos pagados comparables.
- Devolución por importe: dinero devuelto / dinero cobrado de la misma cohorte. No es automáticamente igual a la tasa por cantidad.

No existen en esta investigación tasas públicas verificadas y comparables de esas métricas para los competidores. No sería correcto inventar «aceptación del mercado 20 %» ni deducirla de sus descargas. Las tasas siguientes son **hipótesis para sensibilidad**, no benchmarks observados.

## 7. Embudo ilustrativo de adquisición

| Escenario hipotético | Consultas calificadas/mes | Pasan a prueba | Pruebas que pagan | Pagadores esperados/mes | CAC directo con Q300 de captación |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cauto | 20 | 25 % | 10 % | 0.5 | Q600.00 |
| Intermedio | 30 | 40 % | 20 % | 2.4 | Q125.00 |
| Favorable | 40 | 50 % | 30 % | 6.0 | Q50.00 |

Se permiten fracciones porque son valores esperados, no clientes existentes. Los Q300 incluyen presupuesto de captación; si se gasta solo una parte en anuncios, calcular también CAC del canal con su gasto propio. El CAC completo añade ventas, piezas, onboarding y las pruebas que no pagan. La lista de consultas depende de lograr un costo por consulta compatible: no está garantizada por invertir Q300.

Con la contribución anual media del escenario austero, cercana a Q39.16/mes antes de adquisición adicional, recuperar CAC Q50/Q125/Q600 requiere aproximadamente 1.3/3.2/15.3 meses respectivamente. No es un LTV observado ni prueba de renovación; un CAC que tarda más que la vigencia exige especial prudencia.

## 8. Retención y devolución: ejemplos, no pronóstico

Para **contratos mensuales**, suponer pérdidas independientes de 3/6/10 % de negocios en cada renovación daría permanencia aproximada a doce renovaciones de 69/48/28 %. Es la fórmula `(1 − pérdida mensual)^12`, no evidencia de mercado. No aplicarla a un plan anual pagado de una vez como si se cobrara cada mes.

Para contratos anuales, probar en el presupuesto recompra al vencimiento de 40/60/80 %, como sensibilidad. Solo podrá estimarse de verdad cuando una cohorte complete el año. Un pago anticipado mejora caja y compromiso durante el periodo, pero no garantiza satisfacción ni renovación.

Modelar devoluciones por importe de 0/3/8 % del ingreso contratado. La calculadora usa 3 % como reserva hipotética, conserva comisiones sobre cobros originales y no implementa una política de devolución. Una devolución consume trabajo y puede no devolver comisiones; revisar también el tratamiento tributario real. No se promete una garantía de reembolso por incluir una reserva en el presupuesto.

Muestras pequeñas: cero devoluciones en 30 compras no demuestra una tasa menor al 3 %. Con cero eventos, el límite superior unilateral de confianza del 95 % es `1 − 0.05^(1/n)`: aproximadamente 9.5 % con 30 y 3.0 % con 100. Es un cálculo binomial ilustrativo con sus supuestos, no una garantía ni un estudio representativo.

Si pagan 3 de 20 pruebas, el resultado observado es 15 %, pero el intervalo de Wilson aproximado al 95 % es **5–36 %**. Registrar conteos y maduración de cohorte, no solo porcentajes vistosos.

## 9. Tamaño de mercado: construirlo desde abajo

No se inventa un número de MIPYMES guatemaltecas como TAM. Para la primera decisión basta construir una lista de 100 negocios potenciales de un oficio/zona, obtenida legítimamente, y entrevistar veinte con permiso. Filtrar necesidad recurrente de cotización, uso de teléfono, necesidad de equipo y ausencia de requisitos imprescindibles aún no soportados.

Ejemplo de planeación, no medición: lista de 100 → 40 encajan → 20 aceptan demo → 10 prueban → 2 pagan. Eso sería 2 % de la lista y 20 % de quienes prueban; no significa 20 % de aceptación de todo el mercado. Si solo existen unos pocos prospectos accesibles en el nicho elegido, ampliar zona/alianzas antes de aumentar gasto.

## 10. Prueba comercial recomendada

1. Veinte entrevistas de 15–20 minutos: cómo cotizan, frecuencia, tiempo perdido, dispositivo, servicios reutilizables, necesidad de factura y qué pagarían por resolverlo. Pedir ejemplos anónimos, no nombres/montos de sus clientes.
2. Mostrar el flujo con datos sintéticos; observar cinco demos antes de comprar más publicidad. Distinguir «me gusta» de «lo usaré» y de «pagaré».
3. Ofrecer mensual Q49 y los periodos con descuento, precio final y condiciones claros; anual opcional. Resolver antes correo externo, soporte y privacidad.
4. Acompañar 5–10 pruebas de siete días. Registrar primera cotización/PDF, dificultades y motivo de abandono mediante un registro privado mínimo; no hay un dashboard de marketing automático en Quoter.
5. Meta inicial: tres pagos reales, cierre de incidencias y seguimiento de la primera renovación que corresponda. Es una meta de aprendizaje, no un resultado obtenido.
6. Si hay demos sin uso, corregir onboarding. Si hay uso sin pago, investigar valor/precio/capacidad. Si ni siquiera se consiguen demos del segmento, cambiar mensaje/canal antes de rebajar indefinidamente.
7. Revisar después de Q225–Q300 gastados o cuatro semanas, lo que ocurra primero. No exigir significancia estadística a una muestra diminuta, pero tampoco seguir escalando sin evidencia.

## 11. Criterio de inversión

**Continuar piloto** si hay uso autónomo, pagos voluntarios, soporte manejable y un CAC plausible. **Ajustar** si existe valor pero el cupo/hábito o un requisito importante impide continuar. **Pausar captación pagada** si falla acceso/correo, no se alcanza primer PDF, hay problemas de privacidad/integridad o se consume el presupuesto sin consultas calificadas.

El escenario financiero es un límite para administrar gasto, no una estimación de cuántos clientes llegarán. Los resultados dependen del nicho, confianza, acompañamiento, competencia y retención. No invertir en muchas funciones nuevas antes de observar por qué el segmento compra o abandona.

## 12. Fuentes aún por verificar

Precios y producto: https://www.zoho.com/invoice/pricing/ ; https://invoiceninja.com/pricing/ ; https://www.alegra.com/guatemala/ ; https://betterproposals.io/pricing ; https://qwilr.com/pricing/ ; https://www.holded.com/es/precios ; https://www.guatefacturas.com/ . Informes agregados de retención para contrastar metodología: https://chartmogul.com/reports/saas-retention-report/ . Acceso directo bloqueado en esta revisión; no se citan cifras extraídas de esas páginas.

Para convertir esto en estudio empírico, completar precios observados con fecha, moneda, modalidad, usuarios, impuestos y URL, y resultados propios por cohorte. No mezclar white-label autohospedado, SaaS alojado y facturación fiscal como si fueran el mismo servicio.

## 13. Sensibilidad a la carga de soporte

El umbral de 17–21 negocios supone quince minutos de soporte mensual por pagador, mezcla 70/20/10 y reservas indicadas en el documento 03. Si cada cliente requiere treinta minutos y todos eligen solo el básico anual, con correo pagado el equilibrio vuelve a rondar **51 negocios**. La carga real de atención puede importar tanto como el hosting: medirla antes de fijar promesas de acompañamiento o escalar descuentos.
