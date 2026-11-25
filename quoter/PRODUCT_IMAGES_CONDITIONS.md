# Imágenes de productos y condiciones del negocio

Requiere migración `0023_product_images_conditions.sql`. Añade `image` nullable a catálogo/partidas y `quote_conditions` JSON nullable a negocios. No modifica las cotizaciones, fotos ni condiciones históricas. Debe aplicarse a la D1 de destino antes de desplegar código que consulte las columnas nuevas.

## Uso

En Catálogo, cargar la imagen antes de Guardar partida. En una cotización, elegir del catálogo copia la imagen; el campo de imagen de cada partida permite personalizarla o quitarla. Mi negocio organiza condiciones en Pagos, Entrega y envío, Garantía y validez y Asesor. Los valores vacíos se omiten del PDF.

La opción de ejemplo rellena únicamente campos vacíos: envío a departamentos Q40, garantía de 30 días, política editable y validez de 15 días. El nombre del negocio sustituye el texto «Negocio». No crea información bancaria ni de contacto. El costo de envío escrito en condiciones es informativo; agregarlo como partida si debe cobrarse en el total.

## Persistencia

La API de catálogo acepta `image` como data URL raster o null. Omitirlo al editar conserva la imagen existente. Crear una cotización toma la imagen del catálogo si no se especificó otra; null explícito la excluye. La cotización guarda una copia por partida, independiente de futuras ediciones del catálogo. La edición desde el formulario envía la imagen histórica, sin volver a tomar la foto actual del catálogo.

`quoteConditions` contiene paymentDeadline, paymentMethods, bankTransfer, deliveryTime, shippingPrice, departmentShipping, warranty, validityText, warrantyPolicy, advisorName, advisorEmail y validityDays. Solo se conservan campos conocidos. Validar longitudes, correo y días enteros 1–3650. Las condiciones se combinan con el texto de pago anterior y quedan guardadas en `quotes.payment_terms`, con límite de 12 000 caracteres. La política completa admite 4000 caracteres. El snapshot de marca también conserva la configuración de negocio de ese momento.

Crear desde cero utiliza esas condiciones por defecto; un texto explícito de la cotización las sustituye. Editar o actualizar la marca no cambia las condiciones públicas históricas. Duplicar conserva las condiciones y fotos copiadas y toma la marca actual, siguiendo el comportamiento de duplicación anterior. El vencimiento se calcula a partir de la fecha de emisión y los días configurados cuando no se especifica fecha; null explícito permite sin vencimiento.

## Imágenes y límites

El navegador valida archivos PNG/JPEG/WebP de hasta 10 MiB y 16 megapíxeles, normaliza como PNG o JPEG de hasta 480 px y 60 000 caracteres y elimina metadatos. La conversión a JPEG usa fondo blanco. El servidor valida firmas, MIME, integridad, expansión de PNG y dimensiones de hasta 640 px. Se rechazan SVG, URLs externas, formatos animados o imágenes incompletas. La suma de fotos por cotización está limitada a 500 000 caracteres. No se amplían límites de cuerpos HTTP ni se descargan imágenes de terceros.

Las fotos se dibujan en la columna Descripción de cada modelo PDF. Las condiciones largas continúan en páginas con membrete. Las notas internas y el rótulo «Borrador» permanecen fuera del PDF. La imagen de marca y las imágenes de producto se validan por separado.

## Respaldos y permisos

Formato JSON 2 mantiene una tabla compartida de imágenes: se deduplican logos, fotos de catálogo y fotos históricas antes de cargarlas desde D1. Los registros contienen referencias a esa tabla; la revisión valida cada imagen antes de restaurar. Formatos 1 y 2 admitidos. La restauración conserva fotos y condiciones y sigue siendo idempotente y exclusiva del propietario. Se mantienen los límites de 8 MiB/2000 registros y el procedimiento de copia D1 para volúmenes mayores.

Las rutas y las búsquedas siguen limitadas al negocio activo; una referencia a catálogo ajeno se rechaza. El panel maestro no obtiene imágenes, condiciones, cuentas bancarias ni información de clientes. Las imágenes y los datos bancarios forman parte del contenido privado del negocio y sus respaldos.

## Verificación

`npm test`, `npm run lint`, `npm run build` y el runner aislado de integración. La suite `products-conditions-smoke` prueba carga desde producto/cotización, fotos históricas, validación, condiciones extensas, fechas, permisos entre negocios, respaldo/restauración 1/2 e idempotencia, PDF y móvil. Las pruebas PDF revisan los cuatro modelos con 100 imágenes y varias páginas. La recuperación D1 comprueba también la migración nueva.
