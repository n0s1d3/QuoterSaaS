# Capacitación y preguntas frecuentes

Material del instructor, versión 19 de octubre de 2026. Usar negocios de demostración, correos propios/controlados y datos ficticios. No grabar sesiones con contraseñas, semilla MFA o documentos de clientes visibles. Contar con permiso antes de grabar a una persona.

## 1. Preparación

Antes de una sesión: probar acceso/correo, permisos, vigencia y cupos del negocio; tener un logo de prueba permitido; preparar tres tarifas; asegurar internet y navegador actualizado. El instructor no inicia sesión con la contraseña del alumno ni registra pagos reales para una simulación.

Material por audiencia: Manual de usuario para todos; Administrador de negocio solo para propietarios; Administrador de plataforma solo para el maestro; Arquitectura/operación solo para el responsable técnico. Las horas indicadas son duración de la capacitación, no garantía de velocidad de uso del producto.

## 2. Sesión de usuario: 25 minutos

| Minutos | Actividad | Evidencia de aprendizaje |
| --- | --- | --- |
| 0–5 | Acceso, negocio activo, navegación y cierre de sesión | Identifica correo, negocio y permiso sin ayuda |
| 5–10 | Catálogo: una tarifa por metro y otra por hora | Distingue unidad, precio y vigencia |
| 10–18 | Cliente, cotización de dos partidas, descuento/adicional, notas y condiciones | Obtiene total esperado y explica qué va al PDF |
| 18–22 | Modelo, vista previa y descarga | Encuentra el archivo y verifica logo; notas privadas ausentes |
| 22–25 | Estado, búsqueda y duplicación | Reconoce que Enviada no envía nada y duplicar crea otro número |

Ejercicio ficticio: 2 unidades × Q150, descuento Q20, adicional 5 % = Q294. «50 % al inicio» va en condiciones de pago; «llamar el jueves» en notas internas. El alumno debe explicarlo sin que el instructor lo corrija en pantalla.

## 3. Sesión de propietario: 25 minutos adicionales

| Actividad | Ejercicio |
| --- | --- |
| Marca y modelos | Guardar modelo predeterminado; comprobar documento anterior conservado; cambiar solo modelo de ese documento |
| Equipo | Calcular plazas disponibles; enviar invitación de prueba, aceptar con correo correcto y revocar otra pendiente |
| Plan | Encontrar ID/vigencia y explicar que los cupos no se reinician mensualmente |
| Datos | Exportar JSON, revisar una restauración sin aplicarla a datos reales |
| Papelera | En negocio de prueba, mover y recuperar documento; explicar diferencia con eliminación definitiva |
| Cierre | Definir responsable de renovación, revisión de precios y copias |

Si no hay cupo para la invitación, no usar otra cuenta compartida: explicar que Plan 1 solo admite propietario. No activar un plan de producción solo para completar una clase.

## 4. Sesión de administrador maestro: 30 minutos

La configuración de autenticador/códigos se hace de forma privada; detener la grabación si la sesión se graba. Después demostrar búsqueda por ID, referencia única, nueva vigencia, repetición idempotente y diferencias entre suspender negocio y desactivar cuenta. En entorno de prueba, enseñar un intento de reducción antes de vencimiento y su rechazo.

Ejercicio central: el cliente dice «ya pagué pero no puedo editar». El administrador debe verificar pago/ID, plan/vigencia, suspensión de negocio, estado de cuenta, cupos y actualización de pantalla; no pedir nombres o montos de cotizaciones.

## 5. Sesión del operador: 45–60 minutos

Revisar configuración sin valores secretos; localizar salud y requestId; ejecutar pruebas aisladas; distinguir D1 local/remota; practicar con un respaldo de fixture el ensayo local y plan de recuperación, sin cambiar producción. Verificar cómo se preservan claves y dónde se recibe una alerta. El ensayo de reemplazo publicado real se agenda por separado con autorización y controles de OPERATIONS.md.

## 6. Preguntas de evaluación

1. ¿Qué diferencia hay entre condiciones de pago y notas internas? Las primeras se imprimen; las segundas no van al PDF, pero son datos del negocio y aparecen en sus exportaciones.
2. ¿Cuántas personas adicionales admite Plan 2? Dos, porque sus tres plazas incluyen al propietario; pendientes reservan lugar.
3. ¿Pagar otro mes reinicia las 25 cotizaciones? No; es capacidad acumulada fuera de papelera.
4. ¿Cambiar Mi negocio cambia PDFs antiguos? Conservan snapshot salvo actualización explícita de marca; cambiar solo modelo conserva la marca guardada.
5. ¿Aceptada significa cobrada? No; es un estado registrado manualmente.
6. ¿Cerrar el navegador guarda el borrador? No se ofrece recuperación automática del formulario.
7. ¿Un pago verificado levanta una suspensión? No; son controles separados.
8. ¿Puede soporte pedir la contraseña o códigos MFA? No.
9. ¿JSON sirve para recuperar cuentas/contraseñas? No; es respaldo del contenido de un negocio.
10. ¿El maestro puede abrir documentos de otro negocio? El panel no lo permite; el acceso técnico del operador es un proceso separado y restringido.

Criterio de cierre propuesto: completar el ejercicio de su rol y responder correctamente los puntos de privacidad, precio/cupos y recuperación. Si no, repetir únicamente el flujo que faltó; registrar una mejora del manual si la pantalla no se entiende.

## 7. Preguntas frecuentes del cliente

| Pregunta | Respuesta |
| --- | --- |
| ¿Es una app de celular? | Se usa desde navegador móvil o computadora; requiere conexión |
| ¿Puedo guardar trabajos por metro/hora? | Sí, tipos/unidades personalizables y precios del catálogo |
| ¿Envía por WhatsApp? | Descargas el PDF y lo compartes manualmente; no hay integración de envío |
| ¿Puedo mandar un enlace al cliente para aceptar? | No en esta versión; estados se actualizan dentro del negocio |
| ¿Genera facturas/FEL? | No; cotizaciones y adicional por facturación no equivalen a factura fiscal |
| ¿Calcula ganancias? | Muestra montos aceptados/potenciales de propuestas, sin descontar costos ni confirmar cobros |
| ¿Tengo que pagar al terminar la prueba? | Solo si deseas continuar creando/editando; no hay cargo automático y queda solo lectura |
| ¿Cuál es el precio? | El publicado/aprobado por el vendedor; la base es Q49/Q89/Q149 por mes y hay descuentos 5/10/15 % por 3/6/12 meses; confirmar precio final y condiciones con el vendedor |
| ¿Por qué mi amigo no puede entrar con la invitación? | Debe usar el correo invitado verificado, enlace vigente y cupo válido; revisar negocio vigente |
| ¿Por qué cambió el resumen al borrar una cotización? | La papelera se excluye de vistas activas; recuperar vuelve a incorporarla cuando corresponda |
| ¿Cómo cambio los datos de un cliente existente? | La UI actual crea/selecciona clientes desde cotización; no ofrece una pantalla independiente de edición del perfil. Solicita ayuda antes de crear duplicados |
| ¿Puedo reactivar un artículo archivado? | La pantalla actual muestra catálogo activo sin reactivación por autoservicio; consulta al propietario/soporte |
| ¿Quién puede exportar todo el negocio? | Su propietario, mediante Datos y recuperación, dentro de los límites de la función |
| ¿Cómo elimino la cuenta completa o transfiero propiedad? | No hay autoservicio para ello; se solicita al canal oficial con validación de identidad |
| ¿Los datos desaparecen al vencer? | No hay borrado automático por vencimiento; consulta las condiciones de conservación aprobadas del servicio |

## 8. Plantilla para reportar un problema

Registrar: rol; ID de negocio; fecha y hora Guatemala; navegador/dispositivo; acción y pasos; resultado esperado y observado; referencia técnica si aparece. Si afecta una cotización, usar su número solo si es necesario y una captura recortada. No adjuntar datos de sus clientes, importes privados, JSON o claves por defecto.

Soporte acusa recibo, confirma prioridad y responsable, reproduce con datos ficticios cuando sea posible y comunica resultado. El cliente verifica el flujo corregido. Los tiempos y canal deben ser los publicados y aprobados, no un horario inventado por el instructor.

## 9. Registro de formación

Guardar en un registro externo protegido: fecha, versión del manual, rol, ID de negocio si procede, ejercicios completados, dificultad encontrada y próxima acción. No guardar credenciales, grabaciones innecesarias o contenido del negocio. Al cambiar una funcionalidad, actualizar el manual y enseñar solo la diferencia relevante.
