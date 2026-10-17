# Joel Pines Studio — edición web

Esta carpeta traslada a una aplicación web las funciones del ZIP premium de referencia. Joel solo necesita abrir el enlace en Safari o Chrome; no tiene que instalar nada en el Mac. Para publicar hace falta una cuenta de hosting. No se ha creado una cuenta ni se ha publicado la app.

## Funciones conservadas

- Carga de varias fotos y lista de lote con selección individual.
- Encuadre cuadrado interactivo: arrastrar, redimensionar, zoom y ajuste.
- Rotación libre de −180° a 180° en pasos de 0,5° y botones de 90°.
- Eliminación de fondo con IA en el navegador.
- Fondo blanco o transparente.
- Exportación cuadrada de 800, 1000 o 1500 px en WebP o PNG.
- Descarga de una foto y descarga ZIP con todos los resultados procesados.

El ZIP de referencia contenía `@imgly/background-removal`, `cropperjs`, `jszip` y Vite. Se conservaron esas dependencias y se añadió el selector PNG/WebP solicitado. El Mac de Joel no necesita ninguna de ellas instalada: el servicio de hosting construye y sirve la página.

## Publicar en Cloudflare Pages conectado a GitHub

1. Descomprime el paquete y crea un repositorio nuevo en GitHub con **el contenido de esta carpeta en la raíz** (`index.html`, `package.json` y `src/`).
2. En Cloudflare, abre **Workers & Pages → Create application → Pages → Import an existing Git repository** y conecta ese repositorio.
3. En la configuración de compilación usa:
   - Rama: `main`
   - Comando: `npm run build`
   - Directorio de salida: `dist`
4. Pulsa **Save and Deploy**. Cloudflare instala las dependencias, construye la app y entrega una dirección `*.pages.dev`. Comparte esa dirección con Joel.

El repositorio contiene el código fuente. IMG.LY declara AGPL-3.0 para la biblioteca de eliminación de fondo: antes de publicar para uso comercial, revisa las obligaciones de esa licencia. Si se necesita mantener el código cerrado, solicita a IMG.LY una licencia comercial. ([Licencia del proyecto IMG.LY](https://github.com/imgly/background-removal-js#license))

## Uso en el Mac

1. Abre el enlace en Safari o Chrome y pulsa **Añadir fotografías**.
2. Selecciona una imagen en la lista. Arrastra y ajusta el marco cuadrado, el zoom y la rotación. Repite para cada foto del lote.
3. Elige fondo, formato y resolución; pulsa **Eliminar fondo y procesar**.
4. Descarga cada imagen o pulsa **Siguiente pendiente** para continuar. Al final, **Descargar ZIP** reúne las fotos procesadas.

La primera eliminación de fondo requiere internet para descargar la biblioteca y el modelo de IA (el modelo puede ocupar decenas de MB). Después, las fotos se procesan localmente en el navegador; la app no las sube a su hosting. La biblioteca, el modelo y la fuente tipográfica se obtienen de servicios externos. Fotos muy grandes pueden requerir más memoria y la IA puede necesitar revisión en bordes metálicos finos.

## Dependencias

Las versiones se basan en el manifiesto del ZIP premium:

- `@imgly/background-removal` `^1.5.5`
- `cropperjs` `1.6.2`
- `jszip` `^3.10.1`
- `vite` `^6.4.1` (herramienta de compilación)

El alojamiento usa `npm run build` y publica `dist/`. Para el despliegue con Git, Pages puede construir Vite y publicar esa carpeta. ([Configuración de compilación de Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/build-configuration/))
