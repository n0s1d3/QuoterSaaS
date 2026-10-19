# Manual del propietario / administrador de un negocio

Complementa el Manual de usuario. «Administrador de negocio» significa aquí **Propietario**; no es la cuenta maestra de Quoter. Se administra solo el negocio seleccionado. Versión: 19 de octubre de 2026.

## 1. Responsabilidad y permisos

| Acción en un negocio vigente | Propietario | Editor | Solo lectura |
| --- | --- | --- | --- |
| Ver resumen, catálogo y cotizaciones; descargar PDF | Sí | Sí | Sí |
| Crear/editar clientes desde cotización, catálogo y cotizaciones | Sí | Sí | No |
| Cambiar estado, duplicar, modelo o marca de una cotización | Sí | Sí | No |
| Cambiar marca predeterminada del negocio | Sí | No | No |
| Archivar catálogo o enviar cotización a papelera | Sí | No | No |
| Administrar equipo, plan y respaldos del negocio | Sí | No | No |
| Recuperar o eliminar definitivamente desde papelera | Sí | No | No |
| Abrir Administración de la plataforma o activar pagos | No, salvo que sea además la cuenta maestra | No | No |

Con plan vencido/suspendido se bloquean cambios. Consulta y PDF se conservan; exportar JSON/CSV sigue siendo exclusivo del propietario. Tener varios negocios en el selector no permite pasar información de uno a otro automáticamente.

## 2. Preparar el negocio

En **Mi negocio**:

1. Confirma nombre, NIT, dirección, teléfono y correo del negocio que deseas imprimir.
2. Selecciona colores principal/secundario. Revisa contraste y legibilidad del PDF.
3. Carga el logo: PNG, JPEG o WebP estático de hasta 10 MB de archivo de origen. La app optimiza la imagen; el resultado debe cumplir formato, dimensiones y tamaño admitidos. Un archivo con extensión cambiada no se convierte en imagen válida.
4. Si falla la selección, usa **Descartar selección fallida** para conservar la anterior; **Quitar logo** lo retira de la marca que guardarás.
5. Define condiciones de pago predeterminadas. No uses ese campo para recordatorios privados.
6. Elige modelo: Clásica, Lateral, Minimalista o Corporativa.
7. Pulsa **Vista previa del PDF**. Usa cliente/importes de demostración y no crea una cotización.
8. Pulsa **Guardar marca**. Espera el mensaje de confirmación.

El cambio se aplica a nuevas cotizaciones, incluidas duplicadas. Las existentes conservan su snapshot de marca/modelo. Para una anterior, abre el detalle: cambia solo el modelo si deseas conservar su marca, o usa **Actualizar a la marca actual** para reemplazar todo ese conjunto. Cambiar las condiciones predeterminadas tampoco reescribe las condiciones de pago de documentos existentes.

## 3. Organizar tarifas

Define tipos y unidades coherentes antes de cargar muchos artículos. Ejemplo: «Pintura interior» / Servicio / m² / Q25 / dos días. El tipo y la unidad aceptan opciones personalizadas mediante **Otra opción…**.

Revisar precios al menos con la periodicidad que defina el negocio. Guardar un cambio renueva la fecha de revisión. Las alertas se basan en vigencia o días desde revisión; no consultan precios del mercado. Los valores ya guardados en una cotización son independientes del catálogo actualizado.

Archivar libera capacidad activa y conserva referencias históricas. La interfaz actual no muestra un administrador de partidas archivadas con reactivación; planifica esto antes de archivar una tarifa que quieras reutilizar. El JSON conserva también las archivadas.

## 4. Administrar equipo

1. Abre **Equipo** y comprueba cupos en **Plan y uso**.
2. Escribe el correo del integrante y elige **Editor** o **Solo lectura**.
3. Pulsa **Enviar invitación**. Tiene vigencia de tres días y reserva una plaza mientras está pendiente.
4. El destinatario debe tener una cuenta verificada con exactamente ese correo; abre la invitación y la acepta.
5. Revisa integrantes y permisos. Puede cambiarse entre Editor y Solo lectura o pulsarse **Quitar acceso**.
6. Revoca invitaciones pendientes que ya no correspondan para liberar reserva de plaza.

El propietario cuenta como un puesto: Plan 1 no permite otro integrante; Plan 2 admite dos personas adicionales; Plan 3, cuatro. El propietario no puede quitarse ni degradarse mediante esta pantalla. No hay transferencia de propiedad de negocio por autoservicio en esta versión.

Quitar acceso revoca la membresía del negocio y sus sesiones asociadas; no elimina las cotizaciones realizadas. La cuenta de esa persona y sus otros negocios se conservan. No compartan una contraseña para eludir plazas: se pierde trazabilidad y control de acceso.

## 5. Plan y uso; renovar

La pantalla muestra ID de negocio, plan actual, vigencia, cotizaciones activas, catálogo activo, integrantes e invitaciones pendientes. Al acercarse al cupo se indica advertencia; alcanzar el máximo impide agregar recursos de ese tipo.

Todos los documentos fuera de papelera cuentan, incluidos aceptados, rechazados y vencidos. Los límites son capacidad acumulada y no se reinician cada mes. El catálogo archivado y las cotizaciones en papelera no consumen esos cupos, aunque siguen ocupando almacenamiento.

Para renovar, usa el canal comercial autorizado y comunica ID de negocio, plan deseado y referencia de pago. El administrador verifica externamente y registra la activación. **No hay cargo automático, pasarela de pago ni activación automática por capturas.** Los precios comerciales aprobados se comunican por el canal oficial; esta pantalla no procesa ni valida un monto bancario.

Cada registro agrega un mes calendario y preserva tiempo pendiente del mismo plan/prueba. Una ampliación cambia capacidad inmediatamente y agrega un mes; el sistema no calcula prorrateos. Reducir un plan pagado exige esperar a su vencimiento; no hay cambio programado. Si al reducir el uso excede cupos, se conservan datos y puede requerirse liberar capacidad para crear más.

Al vencer se puede consultar, descargar PDF y exportar JSON/CSV. Restaurar, editar o administrar accesos requiere vigencia. Pagar no levanta una suspensión administrativa; solicitar revisión si el plan aparece activo pero el negocio sigue suspendido.

## 6. Respaldo JSON y CSV

En **Datos y recuperación → Exportar datos**:

- **Descargar respaldo JSON**: perfil, logo, clientes, catálogo, cotizaciones, partidas, marcas históricas y papelera. Admite exportación v2 e importación de v1/v2.
- **Exportar cotizaciones CSV**: tabla para análisis externo; incluye notas internas. No sirve para restaurar todo el negocio.

El JSON no contiene contraseñas, sesiones, equipo ni historial. Sí contiene información privada de tus clientes y negocio. Guardarlo en una ubicación protegida, no en grupos de mensajería ni documentos compartidos públicos.

Límite de esta función: 8 MiB y 2,000 registros sumando tablas, no 2,000 cotizaciones. Cien cotizaciones con muchas partidas pueden superar el límite. Si lo excede, solicitar al operador una alternativa; no borrar información al azar para obtener un archivo más pequeño.

Recomendación de uso: exportar antes de restaurar y después de cambios importantes; definir una frecuencia según el negocio. El respaldo de la plataforma es otro mecanismo, no reemplaza una copia propia accesible.

## 7. Restaurar con revisión

1. Descarga una copia actual antes de sobrescribir.
2. En **Restaurar un respaldo**, selecciona el JSON confiable del negocio.
3. Espera validación, incluida revisión por lotes de logos cuando corresponda.
4. Revisa nombre/fecha del archivo, cantidades y cuántos registros se actualizarán o crearán.
5. Decide si marcar **Reemplazar el perfil y la marca actuales con los del respaldo**. Sin marcarla, conserva la marca predeterminada actual; las copias de marca incluidas en las cotizaciones restauradas corresponden al archivo.
6. Marca **Revisé el contenido y autorizo sobrescribir los registros existentes** y pulsa **Restaurar respaldo**.
7. Comprueba varias cotizaciones, clientes y un PDF. La revisión vence en quince minutos; seleccionar otro archivo reemplaza la revisión pendiente.

Los registros identificados se actualizan; solo se crean los faltantes. Reimportar el mismo respaldo no debe duplicarlos. Los que no están en el archivo se conservan: restaurar no es «borrar todo y reemplazar la cuenta». Las cotizaciones existentes conservan su número; las nuevas reciben uno del negocio destino. Las altas conservan fechas históricas; sobrescribir registra modificación actual.

Perfiles de cliente idénticos pueden consolidarse, incluidas fichas con solo nombre igual. Clientes con datos distintos se mantienen separados. Completa datos para distinguir homónimos y revisa la vista previa; no uses una importación de otro negocio como ensayo sobre el negocio real.

El plan, sus pagos, los integrantes y credenciales no se sustituyen con este respaldo. Una restauración que agrega recursos respeta los límites del plan. Revisa capacidad antes de cargar un archivo grande.

## 8. Papelera y eliminación definitiva

La eliminación de una cotización está solo dentro de su detalle. Moverla a papelera requiere confirmación; desaparece de las vistas activas y puede cambiar el resumen.

En **Datos y recuperación → Papelera de cotizaciones** puedes recuperarla conservando número, estado, partidas y marca, si hay capacidad. No hay limpieza automática. **Eliminar definitivamente** exige escribir su número y opera sobre su revisión guardada; elimina el documento y sus partidas. No se puede deshacer desde la app.

Antes de una eliminación definitiva, confirma que el negocio ya no la necesita y considera sus obligaciones de conservación. No usar la purga como rutina para pagar menos ni confiar en que soporte pueda recuperar un documento individual desde cualquier fecha.

## 9. Historial, seguridad y soporte

En el detalle puede abrirse **Historial de la cotización**. En **Datos y recuperación** el propietario consulta cambios del negocio. No es el log técnico del servidor ni registra acciones anteriores a su implementación. Los logs de diagnóstico de marca/PDF están en el backend, no en las ventanas de cotización.

Para soporte, comparte ID del negocio, número de documento si es indispensable, hora, acción y referencia del error. Recorta capturas; no envíes el JSON, contenido del cliente o contraseñas por canales abiertos. La cuenta maestra gestiona accesos/planes sin entrar a tus cotizaciones.

Lista mensual del propietario: revisar accesos e invitaciones; actualizar tarifas; revisar vencimiento; exportar copia; controlar documentos en papelera; confirmar que la marca y condiciones siguen vigentes. Designa a una persona responsable de renovar: la app no cobra ni manda recordatorios comerciales automáticos.
