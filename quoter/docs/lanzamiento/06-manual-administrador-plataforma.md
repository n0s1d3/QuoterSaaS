# Manual del administrador maestro de Quoter

**Uso interno. No entregar este documento como manual del cliente.** Versión: 19 de octubre de 2026. Este rol opera accesos y suscripciones; no equivale al propietario de cada negocio ni proporciona acceso a sus contenidos.

## 1. Qué se puede ver y qué queda privado

El panel **Administración** muestra cantidades agregadas, nombre e ID de negocios, IDs de cuentas y sus roles, estado de verificación/suspensión, planes, vigencia e historial administrativo. No muestra correos personales de otras cuentas, nombres de los clientes de cotizaciones, importes de sus propuestas, partidas de catálogo, notas, PDFs, contraseñas o tokens. No tiene «entrar como cliente».

Los pagos de suscripciones de Quoter se verifican fuera de este panel. No ingresar montos ni datos bancarios completos en el campo de referencia. Que la app limite la visibilidad del administrador **no significa que el operador de infraestructura carezca de acceso técnico a D1 o a respaldos completos**. Ese acceso requiere custodia, autorización y procedimiento separado; nunca se utiliza para hacer soporte rutinario mirando clientes ajenos.

La cuenta maestra dispone de acceso administrativo y su negocio designado tiene vigencia permanente. No convierte en permanentes todos los negocios existentes ni sustituye las cuotas comerciales de clientes. La pantalla inicial del maestro es Administración; para trabajar con su negocio propio, usa las secciones de negocio correspondientes.

## 2. Acceder y configurar MFA

La cuenta debe existir, tener correo verificado y estar designada como maestra por el operador. Ese alta no crea una contraseña predeterminada ni habilita automáticamente usuarios suspendidos. Usar la contraseña personal propia.

En el primer acceso a **Administración**:

1. En **Protege Administración**, ingresa tu contraseña actual y pulsa **Configurar autenticador**.
2. En una aplicación autenticadora agrega una cuenta Quoter basada en tiempo con la clave manual o el enlace **Abrir aplicación autenticadora**.
3. Confirma con el código de seis dígitos. La configuración pendiente vence en veinte minutos.
4. Guarda los códigos de recuperación en un lugar privado, separado del dispositivo autenticador; se muestran una sola vez.
5. Pulsa **Ya guardé los códigos**.

En accesos posteriores, introduce el código actual o un código de recuperación de un solo uso. La autorización administrativa dura una hora; al caducar se solicita otra prueba. No compartir la semilla, códigos de recuperación ni capturas de esa pantalla. Si los códigos fallan, comprueba hora automática del dispositivo antes de pedir un restablecimiento.

Perder autenticador y recuperación requiere verificar identidad fuera de la app y acudir al operador mediante el procedimiento de ADMIN_MFA.md. No se desactiva MFA para «probar» el panel público. No confundir la semilla del autenticador con `MFA_ENCRYPTION_KEY`: esta última es un secreto del servidor custodiado por el operador.

## 3. Recorrido del panel

| Elemento | Uso |
| --- | --- |
| Indicadores superiores | Cuentas, desactivadas, negocios y suspendidos |
| Confirmar contraseña administrativa | Reautorización para cada cambio; el formulario la limpia tras cada intento |
| Negocios | Estado, plan, vigencia e IDs de cuentas; renovación o suspensión |
| Cuentas | IDs, verificación y negocios asociados; habilitar/deshabilitar acceso |
| Historial | Acciones administrativas con fecha y actor/objetivo por ID |
| Buscar por negocio o ID | Localizar el destino sin pedir contenido privado |

Las listas están paginadas. Si no se encuentra el negocio, confirmar ID y filtro antes de actuar; el nombre puede repetirse. No buscar por nombre de un cliente de las cotizaciones ni solicitarlo para identificar una suscripción.

## 4. Activar o renovar un pago P2P

### Comprobación previa

Verifica externamente: fondos recibidos, importe acordado, plan, ID de negocio, medio y referencia bancaria. Una captura puede estar alterada o ser de otro pago. El panel no tiene acceso al banco ni valida el monto.

Registra la comprobación en el libro privado de cobros de Quoter. Usa una referencia canónica única que puedas reconciliar; no contiene contraseñas, número completo de cuenta bancaria ni información del cliente final del negocio. La misma transacción no debe convertirse en dos referencias distintas por variaciones manuales.

### Acción en Quoter

1. Abre **Negocios**, busca por ID y confirma nombre/plan/vigencia.
2. Pulsa **Activar o renovar plan**.
3. Selecciona el plan correcto y escribe **Referencia única de pago**.
4. En **Confirmar contraseña administrativa**, introduce tu contraseña actual.
5. Pulsa **Registrar pago y renovar** y confirma que verificaste el pago.
6. Revisa el mensaje y la nueva vigencia; informa al propietario para que compruebe **Plan y uso**.

Resultado: un mes calendario añadido; tiempo pendiente conservado; ampliación inmediata. Un plan inferior está bloqueado durante vigencia pagada. No hay prorrateo automático, programación de reducción, facturación fiscal o envío de recibo en este flujo.

Si la referencia ya estaba registrada para el mismo negocio/plan, se informa y no se añade otro mes. Si se usó para otro destino/plan, hay conflicto y no debe inventarse otra referencia para eludirlo. Revisa el libro de cobros y la incidencia antes de continuar.

Si el usuario pagó pero sigue bloqueado, revisar por separado: cuenta desactivada, negocio suspendido, plan vigente, cupo agotado o sesión desactualizada. **Registrar el pago no levanta suspensiones**.

## 5. Suspender y habilitar un negocio

- **Suspender negocio**: conserva datos y acceso de solo lectura; bloquea cambios. Confirmar motivo, ID y autorización antes de aplicarlo.
- **Habilitar negocio**: retira la suspensión; no extiende fechas del plan ni reactiva cuentas individuales. Si el plan venció, seguirá en solo lectura hasta renovar.

No usar suspensión como una eliminación de datos ni como reemplazo del vencimiento automático. Mantener ticket de motivo, responsable, comunicación y criterio de reapertura fuera del panel si el historial no incluye ese contexto.

## 6. Desactivar y activar una cuenta

En **Cuentas**, localizar el ID correcto y comprobar sus negocios asociados. **Desactivar cuenta** revoca sus sesiones y bloquea su acceso, sin borrar sus datos o eliminar los otros integrantes del negocio. **Activar cuenta** permite autenticarse nuevamente si los demás requisitos se cumplen; no verifica el correo por el usuario ni concede propiedad de otros negocios.

El panel impide desactivar la propia cuenta maestra. Si hay un problema de acceso del maestro, usar el procedimiento del operador; no crear una segunda cuenta con contraseña compartida.

## 7. Errores de cobro, devoluciones y cambios

No hay autoservicio de anulación de activaciones ni devolución bancaria. Ante un pago mal asignado:

1. Detener nuevos registros relacionados y abrir una incidencia.
2. Guardar IDs, plan, referencia y fechas, sin adjuntar datos de cotizaciones del negocio.
3. Conciliar externamente el abono y establecer la corrección autorizada con el operador.
4. Ejecutar un procedimiento controlado con respaldo y revisión; verificar vigencias/cupos e informar al negocio afectado.

No «compensar» agregando meses indiscriminadamente ni editando D1 a mano durante una llamada. Una devolución externa no cambia por sí misma la suscripción de Quoter. Aplicar solo una política comercial aprobada; el borrador comercial del paquete no la implementa.

## 8. Rutina administrativa

| Frecuencia | Trabajo |
| --- | --- |
| Al inicio del horario de atención | Revisar consultas, entregas fallidas de cuenta y alertas del operador |
| Por cada pago | Verificar abono/destino, registrar una vez, comprobar vigencia y emitir comprobante externo |
| Diario | Conciliar pendientes y detectar registros duplicados o pagos no aplicados |
| Semanal | Revisar pruebas que terminaron, renovaciones, incidencias, consumo y tiempos de soporte |
| Mensual | Revisar acceso maestro, recuperación custodiada, costos, política y resultados de cohortes |

Los seguimientos de prueba/renovación son manuales en esta versión. Informar solo mediante canales autorizados y con permiso de contacto. El administrador no necesita ver montos o nombres de los clientes de un negocio para renovar su plan.

## 9. Qué pedir a soporte técnico

ID de cuenta/negocio, acción, fecha/hora Guatemala, estado esperado/observado y referencia técnica del error. No pedir contraseña, semilla/códigos MFA, token de enlace o respaldo completo del negocio por mensajería. Si una captura expone contenido privado, solicitar una versión recortada.

Incidentes de acceso ajeno o pérdida de datos requieren detener la operación afectada, avisar al operador y conservar evidencia mínima. No publicar consultas SQL ni documentos de clientes para reportar un fallo.

## 10. Evaluación del administrador

Con datos de prueba, demostrar: entrar con MFA; localizar negocio por ID; registrar un mes; repetir referencia sin duplicar; distinguir vencido de suspendido; habilitar sin alterar vigencia; desactivar una cuenta de prueba sin borrar el negocio; consultar historial; explicar por qué no se pide información privada de cotizaciones.
