# Vercel Blob storage for tactical diagrams

Tactical diagram PNGs generated from the session editor are stored in **Vercel Blob**.

## Endpoints que usan Blob

- `/api/uploads/diagram`
	- Guarda el PNG renderizado de cada ejercicio (miniatura del diagrama).
- `/api/uploads/diagram-background`
	- Guarda la imagen de fondo de la cancha y la "Imagen del ejercicio" subida desde el editor.

Ambos endpoints usan `@vercel/blob` y requieren el mismo token de escritura.

## Variables de entorno requeridas (PROD / Vercel)

En el proyecto de Vercel, configurá en **Environment Variables**:

- `BLOB_READ_WRITE_TOKEN`
	- Token de lectura/escritura de Vercel Blob.
	- Se pasa explícitamente a `put()` como `token`.
	- Si falta en producción, las rutas de upload responden con:
		- `500` y `{ error: "Blob storage no configurado: falta la env BLOB_READ_WRITE_TOKEN en el entorno de despliegue." }`.

Recomendaciones:

- Definilo al menos en los entornos `Production` y `Preview` de Vercel.
- Nunca lo commitees al repo ni lo compartas públicamente.

## Comportamiento en desarrollo

En desarrollo (`NODE_ENV !== "production"`):

- Si `BLOB_READ_WRITE_TOKEN` **está definido**:
	- Los endpoints usan Vercel Blob igual que en producción.
- Si `BLOB_READ_WRITE_TOKEN` **no está definido**:
	- `/api/uploads/diagram-background` usa un **fallback local**:
		- Decodifica el PNG y lo guarda en el filesystem bajo:
			- `public/dev-uploads/sessions/<safeSessionId>/diagram-background-<uuid>.png`
		- Devuelve una URL pública relativa:
			- `/dev-uploads/sessions/<safeSessionId>/diagram-background-<uuid>.png`
	- Esto permite desarrollar y probar subidas de imágenes sin configurar Blob en local.

El endpoint `/api/uploads/diagram` mantiene el comportamiento original: requiere `BLOB_READ_WRITE_TOKEN` en todos los entornos.

## Cómo testear la configuración

1. **Producción / Vercel**
	 - Configurá `BLOB_READ_WRITE_TOKEN` en el dashboard de Vercel.
	 - Deploy.
	 - Desde OPENBASE (sesiones CT):
		 - En el editor de ejercicio:
			 - Usá "Imagen del ejercicio" → subir un PNG/JPG pequeño.
			 - Usá "Subir imagen de fondo" dentro del editor de cancha.
		 - Verificá que ambas acciones devuelven una URL HTTPS de Blob y que:
			 - La imagen se ve inmediatamente.
			 - Tras recargar la página, la imagen sigue ahí.

2. **Desarrollo sin Blob**
	 - Asegurate de **no** definir `BLOB_READ_WRITE_TOKEN` en `.env.local`.
	 - Levantá el proyecto (`npm run dev`).
	 - Desde el editor de sesiones:
		 - Subí una "Imagen del ejercicio".
		 - Subí una "Imagen de fondo".
	 - Verificá:
		 - Que no aparece un error de configuración de Blob.
		 - Que las URLs generadas empiezan con `/dev-uploads/...`.
		 - Que los archivos existen bajo `public/dev-uploads/...`.

3. **Error de configuración en producción**
	 - Si olvidás configurar `BLOB_READ_WRITE_TOKEN` en Vercel:
		 - Los uploads fallarán con `500` y el cuerpo JSON incluirá el mensaje:
			 - `"Blob storage no configurado: falta la env BLOB_READ_WRITE_TOKEN en el entorno de despliegue."`
		 - El cliente mostrará un mensaje de error claro con el `status` y el detalle.

