# NawiSystems — landing page

Landing de una sola página para NawiSystems y su producto *Nawi Revenue Intelligence* (nombre provisional). HTML5, CSS3 y JavaScript vanilla; sin dependencias ni paso de compilación.

## Estructura

```
index.html              Marcado semántico, sprite SVG de iconos y logotipo
css/styles.css          Tokens (custom properties) y componentes BEM
js/config.js            Marca, URL pública, endpoint del formulario y datos sintéticos de la demo
js/demand-model.js      Modelo de demanda determinista de la demo
js/charts.js            Gráficas SVG (línea temporal y curva de demanda)
js/main.js              Navegación, dashboard del hero, simulador y formulario
assets/icons/favicon.svg
```

## Ejecutar en local

Los scripts son clásicos (`defer`), así que la página también abre con doble clic. Para probarla como en producción:

```sh
python -m http.server 8765
# http://127.0.0.1:8765/
```

## Configuración antes de publicar

Todo en `js/config.js`:

| Clave | Efecto |
|---|---|
| `brand.product` | Nombre del producto en toda la página (el HTML conserva el valor por defecto como respaldo sin JS). |
| `siteUrl` | Con valor, se generan `<link rel="canonical">` y `og:url`. Es preferible escribirlos también de forma estática en `<head>` cuando el dominio sea definitivo. |
| `contactEndpoint` | URL HTTPS que recibe `POST` con JSON `{ reason, name, company, email, platform, message, source, product }`. Vacío = el formulario valida pero avisa que **no** se envió nada. |
| `corporateInfo` | Texto del pie (razón social, RFC, domicilio). Vacío = no se muestra. |
| `demo.*` | Datos sintéticos del dashboard y del simulador. |

Pendientes que no se pueden resolver desde el código:

- **Aviso de privacidad** (LFPDPPP): obligatorio antes de conectar el formulario, porque recoge nombre y correo. Cuando exista, enlazarlo junto al botón de envío y en el pie.
- **Imagen Open Graph** (1200×630) y `og:image`; hoy no se declara para no apuntar a un archivo inexistente.
- **Fuentes**: Archivo se carga desde Google Fonts. Para eliminar la petición a terceros, autoalojar los `woff2`.
- **Logotipo**: el símbolo y el wordmark son provisionales.

## Modelo de la demo

`unidades/mes = maxUnits / (1 + e^(sensitivity · (precio / mediana − 1) − offset))`, redondeado a unidades enteras.

- Ingresos = precio × unidades
- Beneficio bruto = (precio − costo unitario) × unidades
- Margen bruto = beneficio bruto ÷ ingresos × 100

Con los parámetros actuales el máximo de ingresos ($1,719) y el de beneficio ($2,099) quedan en precios distintos del actual ($1,899): bajar el precio no siempre sube el beneficio y subirlo no siempre sube los ingresos. Es ilustrativo, no Machine Learning.

## Cifras y fuentes

- Se publica solo una cifra de terceros, verificada en la fuente primaria: BCG, *Overcoming Retail Complexity with AI-Powered Pricing* (16 abr 2024): +5 % a +10 % de beneficio bruto.
- Las cifras del brief (+6–11 % ventas, +3–8 % beneficio neto, −20–40 % sobreinventario, +10–30 % conversión, 99 % de exactitud) no se publicaron: no se encontró fuente primaria que las respalde con esa definición. Se sustituyeron por los indicadores que se miden en cada proyecto.

## Convenciones CSS

- BEM con especificidad plana: una clase por selector. Los estados (`:hover`, `:focus-visible`, `[aria-pressed]`, `[aria-invalid]`) se escriben sobre esa clase, y los modificadores de bloque afectan a sus elementos (`.bloque--mod .bloque__elemento`).
- Sin `!important`. `prefers-reduced-motion` anula transiciones mediante el token `--transition`.
- Los elementos que se ocultan con el atributo `hidden` no declaran `display`.
