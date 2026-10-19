# Manual de usuario de Quoter

Versión de referencia: 19 de octubre de 2026, base `44e2561` y periodos 0022. Para propietarios, editores y personas con permiso de solo lectura de un negocio. Los botones disponibles dependen del permiso y de la vigencia del negocio. Todos los ejemplos son ficticios.

## 1. Qué puedes hacer

Guardar precios reutilizables, crear cotizaciones en GTQ, darles seguimiento y descargar PDFs con la imagen del negocio. Quoter funciona desde un navegador de computadora o celular con conexión a internet; no es una app de trabajo offline. El borrador del formulario no se recupera automáticamente si cierras el navegador.

Una cuenta puede pertenecer a varios negocios. Antes de crear, editar o descargar, revisa el negocio seleccionado en el menú lateral. Los datos y el plan corresponden a ese negocio.

## 2. Crear y verificar tu cuenta

1. Abre la dirección de Quoter proporcionada por el vendedor y pulsa **Crear cuenta para mi negocio**.
2. Escribe el nombre del negocio, tu correo, una contraseña de 12–128 caracteres y la misma contraseña en **Confirmar contraseña**.
3. Completa la verificación de seguridad si aparece. Si caduca, complétala otra vez antes de enviar.
4. Pulsa **Crear cuenta**. Aparecerá **Verifica tu correo**.
5. Abre el enlace recibido; tiene vigencia de 24 horas y es de un solo uso. En la pantalla de confirmación escribe tu contraseña actual y verifica.
6. Continúa a la app; si la pestaña anterior aún muestra la verificación, pulsa **Ya verifiqué, actualizar**.

La cuenta nueva crea un negocio con siete días de prueba del Plan 1. La prueba comienza al crear el negocio, no al generar el primer PDF. Sin un correo que puedas recibir no puedes completar el acceso; consulta spam y usa **Reenviar verificación** cuando corresponda. Solicitar otro enlace invalida los anteriores según el flujo de cuenta.

Si te invitaron a un negocio, utiliza el mismo correo de la invitación. Tras registrarte y verificarlo, vuelve a abrir la invitación y pulsa **Aceptar invitación**. Puede conservarse además el negocio propio creado al registrarte; aceptar no copia los datos entre negocios.

## 3. Iniciar y cerrar sesión; recuperar acceso

En **Iniciar sesión**, usa tu correo y contraseña. Puede aparecer una verificación de seguridad después de varios intentos. Si hay demasiados, respeta el tiempo de espera indicado.

Para recuperar la contraseña, pulsa **Olvidé mi contraseña**, escribe el correo y solicita el enlace. Dura 30 minutos, permite un uso y requiere escribir dos veces la nueva contraseña. El restablecimiento cierra las sesiones anteriores; entra nuevamente en tus dispositivos. No compartas el enlace con soporte.

Para salir, abre el menú de usuario en la esquina superior derecha y pulsa **Cerrar sesión**. No hay botón de salida en el menú lateral. Si hay un borrador sin guardar, Quoter puede pedir que confirmes abandonarlo.

## 4. Navegación

| Lugar | Para qué sirve |
| --- | --- |
| Resumen | Importes cotizados, estados, categorías y recordatorios |
| Cotizaciones | Buscar propuestas, cambiar estado y abrir/editar/duplicar |
| Catálogo | Tarifas de productos, servicios y tiempos reutilizables |
| Selector Negocio | Cambiar entre negocios a los que tienes acceso |
| Búsqueda superior | Buscar cliente o número de cotización dentro del negocio activo |
| Menú de usuario | Identificar tu cuenta y cerrar sesión |

El propietario ve además **Mi negocio**, **Equipo**, **Plan y uso** y **Datos y recuperación**. La cuenta maestra tiene un área **Administración** separada; ser propietario de un negocio no concede ese acceso.

En móvil, abre el menú con el icono de menú y ciérralo tocando fuera o el botón de cierre. Los paneles desplegables se repliegan al interactuar fuera; también puedes usar Escape en computadora. Las tablas pueden desplazarse horizontalmente en espacios estrechos.

## 5. Primera cotización paso a paso

### Cliente y fechas

1. Pulsa **+ Nueva cotización**.
2. Busca un cliente existente o selecciona **+ Nuevo cliente**.
3. Para uno nuevo, completa al menos **Nombre**; puedes añadir empresa, teléfono y correo.
4. Selecciona fecha de emisión y, si quieres, **Válida hasta** en el calendario. El vencimiento no puede preceder a la emisión.

Los clientes se crean desde este formulario; no existe una sección independiente de alta de clientes. Busca antes de crear otra ficha. El nombre puede ser igual para personas distintas; usa empresa/correo/teléfono para diferenciarlas. Si ya se guardó una ficha, seleccionarla no es un formulario para cambiar sus datos de contacto.

### Partidas

5. Elige un producto/servicio del catálogo o escribe la descripción manualmente.
6. Indica cantidad y precio unitario. La cantidad puede ser decimal, por ejemplo 2.5 metros. El precio se expresa en quetzales con hasta centavos.
7. Ajusta unidad, tiempo estimado y vigencia del precio cuando aplique.
8. Usa **+ Agregar partida** o **+ Agregar otra partida** para nuevas filas. Se admiten entre una y cien partidas.
9. Revisa el importe de cada fila y las alertas de precio antiguo/vencido. Una alerta requiere revisión; no es una actualización automática del precio.

Al copiar una partida del catálogo, la cotización guarda esos valores. Cambiar posteriormente el catálogo no reescribe las cotizaciones guardadas. No se agregan impuestos por partida en cotizaciones nuevas; documentos históricos pueden mostrar impuestos anteriores.

### Descuento, adicional y textos

10. Si corresponde, indica el descuento como monto en Q. No puede exceder el valor de la cotización.
11. Elige **Adicional por facturación**: sin adicional, monto fijo o porcentaje. No es una función de facturación fiscal ni una tasa tributaria automática.
12. Escribe **Condiciones de pago** para el cliente: por ejemplo «50 % de anticipo y 50 % al entregar». Este texto sí se imprime en el PDF.
13. Escribe recordatorios en **Notas internas**: por ejemplo «Llamar en tres días». No se incluyen en el PDF, pero las ven las personas del negocio con acceso y se incluyen en sus respaldos/CSV. No son un lugar para guardar contraseñas.
14. Si aparece el selector de modelo, escoge Clásica, Lateral, Minimalista o Corporativa.
15. Revisa el total y pulsa **Guardar cotización**. El servidor valida y calcula el documento; recibirás un número como Q-0001 del negocio.

Ejemplo sin impuestos: 2 × Q150 = Q300; descuento Q20 → Q280; adicional 5 % de Q280 = Q14; total **Q294**. El porcentaje se calcula después del descuento; los redondeos se hacen a centavos. No confundas total de la cotización con utilidad o dinero cobrado.

Si falla el guardado después de crear un cliente, revisa el cliente seleccionado y reintenta el guardado; no crees varias fichas para resolver un error de red.

## 6. Consultar, editar, duplicar y dar seguimiento

En **Cotizaciones**, usa búsqueda, fechas, filtro de estado y **Solo vencidas**. La lista tiene páginas cuando hace falta; quitar filtros permite encontrar documentos que parecían faltar.

Las tarjetas muestran cliente, notas internas y total. Sus botones inferiores son **Ver**, **Editar** y **Duplicar**. En **Resumen**, las tarjetas recientes son miniaturas que abren el detalle.

| Estado | Uso recomendado |
| --- | --- |
| Borrador | Estás preparando la propuesta |
| Enviada | Ya la entregaste por un canal externo |
| Aceptada | Registras que el cliente aceptó |
| Rechazada | Registras que no continuará |

Pulsar **Enviada** no manda un correo o WhatsApp. **Aceptada** no confirma que se recibió dinero ni registra una firma del cliente. Cambiar estado actualiza el seguimiento y el resumen.

**Editar** permite modificar y guardar el documento existente conservando su número. Si otra pestaña/persona lo cambió, aparece un conflicto: tu borrador permanece en el formulario. Copia lo que necesites conservar y usa **Recargar versión guardada** cuando decidas descartar la copia local; no recargues a ciegas.

**Duplicar** guarda una cotización nueva en borrador con número nuevo y abre su edición. Copia las partidas y condiciones del documento de origen, usa fecha actual, limpia su vencimiento y captura la marca/modelo actuales del negocio. Ya consume un cupo antes de terminar de editarla; cancelar la edición no borra esa nueva copia. Revisa los datos del cliente y condiciones antes de usarla.

Si editas una cotización histórica con impuestos, el formulario advierte que al guardar se recalculará sin impuestos. Para preservar ese histórico, evita guardarlo sin revisar la diferencia y guarda una copia del PDF/JSON apropiada.

## 7. Modelos, vista previa y PDF

Abre una cotización guardada y pulsa **Vista previa del PDF**. El documento real se genera con sus datos guardados. Si el navegador móvil no integra visor, usa **abrir PDF en otra pestaña**. Cierra con **Cerrar vista previa**, Escape o el fondo del diálogo cuando corresponda.

Pulsa **Descargar PDF** para guardar el archivo con su número. En celular puede quedar en Descargas/Archivos; desde allí puedes enviarlo manualmente por correo o mensajería. No existe botón de envío automático de cotizaciones ni enlace público en esta versión.

| Modelo | Aspecto |
| --- | --- |
| Clásica | Membrete del diseño original y tabla tradicional; predeterminado para documentos anteriores |
| Lateral | Columna de marca a la izquierda y contenido a la derecha |
| Minimalista | Fondo blanco y distribución limpia |
| Corporativa | Franjas oscuras y acentos de marca |

En **Marca de esta cotización**, cambiar solo el modelo conserva logo, nombre, colores e importes guardados. **Mantener marca guardada** confirma que deseas conservarla. **Actualizar a la marca actual** reemplaza explícitamente los datos de marca y el modelo por los actuales del negocio; pide confirmación. Solo personas con permiso de edición y negocio vigente pueden cambiarlos.

Las cotizaciones nuevas capturan la marca actual; las existentes no cambian al editar Mi negocio. Si un documento viejo no tiene marca, solicitar al propietario/editor que la actualice antes de generar el PDF. El PDF pagina documentos largos y puede repetir el logo. Siempre revisa su contenido antes de compartirlo.

## 8. Catálogo reutilizable

Si tu permiso lo permite, entra a **Catálogo** y completa **Guardar nueva partida**:

- Tipo: Producto, Servicio, Asesoría, Consulta, Instalación o **Otra opción…**.
- Unidad: unidad, metro, m², hora, día, sesión, proyecto u otra definida por ti.
- Nombre, precio por unidad y descripción opcional.
- Tiempo estimado y precio válido hasta, si aplican.
- **Avisar después de (días)**: entre 1 y 3650; la propuesta inicial del formulario es 90.

Pulsa **Guardar partida**. Guardar una edición confirma que revisaste el precio hoy. Usa **Editar precio / revisar** para actualizarlo. Ordenar por **Más vendidos (cotizaciones aceptadas)** suma las cantidades de partidas de catálogo vinculadas a cotizaciones aceptadas fuera de papelera; no es inventario, ventas facturadas ni cobros comprobados.

El propietario puede **Archivar** una partida. Desaparece del catálogo activo y libera ese cupo, sin modificar cotizaciones anteriores. No se ofrece actualmente una pantalla de gestión de archivados con botón de reactivación; si necesitas reusar una tarifa, consulta al propietario antes de duplicar registros o solicitar ayuda.

## 9. Interpretar Resumen

- **Monto aceptado**: suma de cotizaciones marcadas Aceptada. No descuenta costos ni confirma pagos.
- **Monto potencial**: borradores y enviadas vigentes, incluidas las que no tienen vencimiento; excluye rechazadas y pendientes vencidas.
- Gráfico de montos: seis meses según fecha de emisión; no según fecha del pago.
- Estado de las cotizaciones: distribución por estado y accesos a sus filtros.
- Categorías: una cotización puede contar una vez en cada categoría presente; una partida manual puede aparecer sin categoría. Las categorías corresponden al catálogo actual.
- Recordatorios: pendientes vencidas, próximos siete días, borradores y precios por revisar.

Los filtros de búsqueda/fecha/estado afectan el resumen. Las cotizaciones en papelera no forman parte de las vistas activas. Mover muchas a papelera puede cambiar importes y estadísticas; no interpretarlo como pérdida de los documentos, ni usarlo rutinariamente para mantener un histórico analítico.

Los recordatorios son visibles al entrar a la app; no son notificaciones push o mensajes automáticos. No se registra rentabilidad real, inventario ni estados bancarios.

## 10. Permisos, límites y vencimiento

El lector puede consultar y descargar PDF, pero no crear o cambiar documentos. El editor puede crear/editar catálogo y cotizaciones; el propietario administra además marca, equipo, datos, plan y eliminación. El manual del propietario detalla esas tareas.

Al vencer la prueba/plan, los datos siguen consultables y se pueden descargar PDFs; el propietario conserva exportación de respaldos. Crear, editar, cambiar estados, restaurar o administrar equipo queda bloqueado hasta renovar. La suspensión de un negocio también permite solo lectura; desactivar una cuenta impide que esa persona acceda. Un nuevo pago no elimina por sí solo una suspensión.

Llegar al cupo no elimina datos. Consulta al propietario para revisar uso o ampliar; los cupos de cotizaciones no se reinician al pagar otro mes.

## 11. Problemas frecuentes

| Situación | Qué hacer |
| --- | --- |
| No llega verificación/recuperación | Revisar correo, spam y último enlace; solicitar otro si expiró; reportar entrega al soporte sin reenviar tokens |
| Registro o seguridad no disponible | Reintentar el desafío si caducó; si persiste, soporte revisa Turnstile/correo; no desactivar protecciones |
| No puedo editar | Revisar rol, negocio, vigencia y suspensión; el propietario debe gestionar permisos/renovación |
| No encuentro una cotización | Quitar filtros, revisar páginas/negocio y pedir al propietario revisar papelera |
| El PDF no tiene la nueva marca | La copia histórica se conserva por diseño; usar Actualizar a la marca actual si deseas reemplazarla |
| Falta logo o falla PDF | Probar un logo válido con el propietario; revisar vista previa y mensaje de error, sin compartir archivos privados públicamente |
| La vista previa móvil está vacía | Abrir PDF en otra pestaña o descargarlo; probar otro navegador actualizado |
| Otro usuario cambió el documento | Conservar el borrador, comparar y recargar explícitamente la versión guardada |
| Error inesperado | Registrar hora de Guatemala, acción y referencia/requestId si aparece; enviar captura recortada sin datos del cliente |

## 12. Práctica para completar la capacitación

Con un negocio de demostración: verificar la cuenta; guardar tres tarifas; crear una cotización con dos partidas, descuento y adicional; diferenciar condiciones de pago de notas internas; generar PDF; cambiar estado a Enviada; duplicarla y reconocer el nuevo número; buscarla; cerrar sesión. El usuario termina cuando puede repetir el flujo sin que el instructor opere su cuenta.
