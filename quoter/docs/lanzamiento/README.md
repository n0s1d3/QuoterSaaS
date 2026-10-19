# Lanzamiento y documentación de Quoter

Preparado el **19 de octubre de 2026**, horario de Guatemala. Mercado: Guatemala; moneda: quetzales. Presupuesto de marketing elegido: Q300–Q1,000 mensuales; piloto recomendado: Q300 antes de ampliar gasto. Versión funcional revisada: base `44e2561` y ampliación de periodos, esquema hasta `0022_billing_periods.sql` (requiere despliegue).

Este paquete documenta lo que existe y propone cómo comercializarlo. **Incluye precios y periodos de la app, sin configurar anuncios, automatizar cobros ni publicar políticas legales.** Los importes base de venta y descuentos están definidos para esta versión; la publicación y obligaciones tributarias requieren revisión. Las tarifas de proveedores son presupuestos de referencia, pendientes de validación en sus paneles.

## Qué leer y a quién entregar cada documento

| Documento | Destinatario | Uso |
| --- | --- | --- |
| [01 · Estado y salida a producción](01-estado-y-lanzamiento.md) | Propietario de Quoter | Avance, bloqueos, criterios de salida y calendario |
| [02 · Marketing y distribución](02-marketing-y-distribucion.md) | Ventas / marketing | Nicho, oferta, canales, anuncios, embudo y campaña de 90 días |
| [03 · Costos, precios y cobro](03-costos-precios-y-cobro.md) | Dirección / operación de cobros | Presupuesto, rentabilidad, precios propuestos y proceso P2P |
| [04 · Manual de usuario](04-manual-usuario.md) | Propietarios, editores y lectores de un negocio | Cuenta, catálogo, cotizaciones, PDF y solución de problemas |
| [05 · Administrar un negocio](05-manual-administrador-negocio.md) | Propietario de un negocio cliente | Marca, equipo, capacidad, renovación, respaldo y papelera |
| [06 · Administrar Quoter](06-manual-administrador-plataforma.md) | Cuenta maestra | MFA, accesos, planes, conciliación y privacidad |
| [07 · Arquitectura y operación](07-arquitectura-y-operacion.md) | Responsable técnico | Componentes, datos, rutas, despliegue, monitoreo y recuperación |
| [08 · Kit comercial y políticas](08-kit-comercial-y-politicas.md) | Propietario / revisión contable y legal | Textos listos para adaptar, soporte y borradores de condiciones |
| [10 · Mercado y validación](10-estudio-de-mercado-y-validacion.md) | Dirección / ventas | Competidores, fuentes verificadas, hipótesis de conversión, devolución y piloto |
| [09 · Capacitación y preguntas frecuentes](09-capacitacion-y-faq.md) | Instructor / soporte | Sesiones prácticas, evaluaciones y respuestas habituales |

Los archivos HTML y PDF del directorio `entregables/` permiten leer o imprimir los manuales sin instalar Quoter. **Entrega a cada audiencia solo su manual**: el material del administrador maestro y del operador es de uso interno. El [índice HTML](entregables/index.html) enlaza todas las versiones. La [calculadora de costos](entregables/calculadora-costos.html) funciona sin conexión; no guarda datos ni se conecta con negocios reales.

## Estado de preparación

**93 % estimado**, manteniendo el criterio de la hoja de ruta. La app ya está desplegada, según confirmó el propietario, pero todavía no hay evidencia completa del alta y uso de clientes externos ni de toda la preparación operativa. No es cobertura de pruebas, una garantía de seguridad ni una estimación de horas restantes.

La verificación anterior aprobó 89 pruebas unitarias, tipos, lint, build, 20 suites de integración y recuperación D1. La ampliación actual modifica periodos, tarifas y documentación; su evidencia de verificación se registra en REMEDIATION.md. El despliegue fue confirmado por el propietario. El 19 de octubre no se pudo revalidar la URL pública desde este entorno por fallo de resolución/red. Tampoco fue posible consultar las páginas oficiales de tarifas: el proxy respondió 403. No interpretar esos bloqueos como una caída del servicio del cliente.

## Material técnico ya existente

- [Instalación y desarrollo](../../README.md).
- [Configuración pública](../../PRODUCTION_SETUP.md), [correo](../../RESEND_SETUP.md), [MFA](../../ADMIN_MFA.md) y [contraseñas](../../PASSWORD_SECURITY.md).
- [Operación y recuperación](../../OPERATIONS.md), [aceptación pública](../../ACCEPTANCE.md), [hoja de ruta](../../ROADMAP.md) y [reparaciones y evidencia](../../REMEDIATION.md).

Revisar estos manuales cuando cambie una pantalla, permiso, cuota, vigencia, precio o política. Conservar la fecha y versión que se enseñó al cliente. Las decisiones comerciales pendientes se enumeran en el documento 01; no presentarlas como funciones ya desplegadas.

## Regenerar los archivos de entrega

Los Markdown son la fuente y los PDF/HTML de `entregables/` están incluidos. Para regenerarlos en un equipo de documentación con **Pandoc** instalado y las dependencias del proyecto:

```powershell
node docs/lanzamiento/generar-entregables.mjs
```

El generador requiere el navegador Chromium de Playwright; admite `QUOTER_BROWSER_PATH` para usar uno instalado y `--solo-html` para omitir PDF. Se verificó en Linux en este entorno; la regeneración en Windows requiere instalar Pandoc y Chromium. No es un comando requerido para ejecutar o desplegar la app. La calculadora y la hoja de estilos están en `entregables/` como fuentes estáticas; el generador no las sobrescribe.

## Comprobación de este paquete

Se verificaron los enlaces locales, encabezados de los diez PDF, doce páginas HTML, contenido legible de muestras PDF y diseño sin desbordamiento a 375 px. La calculadora se comprobó a 375/768/1440 px, con ejemplos financieros independientes, restablecimiento y rechazo de entradas inválidas; no produjo solicitudes de red ni errores del navegador. Lint también aprobado. Estos controles validan el material y su calculadora, no repiten la aceptación de producción de Quoter.

```powershell
node docs/lanzamiento/verificar-entregables.mjs
```

La tabla de costos también está disponible en [CSV](costos-escenarios.csv). Los datos son supuestos de planificación, no cobros o cuentas reales. Para entregar al cliente bastan los PDF 04 y, si es propietario, 05; los demás documentos son para dirección, formación o administración interna.

## Actualización de periodos y mercado

La versión con 0022 añade 1/3/6/12 meses y descuentos 0/5/10/15 %, con tarifa por negocio calculada en servidor. El estudio 10 incluye tres competidores con documentación oficial consultada y distingue precios no verificables y tasas hipotéticas. El recálculo recomienda iniciar con Q300 de captación, sin afirmar que una reserva de correo gratuito cubra cualquier cuenta o volumen. La política existente de ampliación se conserva mientras se define la alternativa de crédito proporcional; sus efectos comerciales están documentados.

Las tasas propuestas de conversión, devolución y renovación son sensibilidades, no estadísticas de clientes reales ni datos privados de competidores. El código, documentos y calculadora se verifican antes de publicar; producción no se modifica desde este entorno.

Verificación de la ampliación: 94 pruebas unitarias, tipos/build/lint, 21 suites de integración y recuperación D1 aprobados; doce HTML y diez PDF comprobados. La verificación no confirma demanda de mercado ni cambia producción.
