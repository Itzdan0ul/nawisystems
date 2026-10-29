(() => {
  'use strict';

  const Nawi = (window.Nawi = window.Nawi || {});

  Nawi.config = Object.freeze({
    brand: Object.freeze({
      company: 'NawiSystems',
      product: 'Nawi Revenue Intelligence',
    }),

    // URL pública definitiva, sin barra final (ej. "https://dominio.tld").
    // Mientras esté vacía no se publican canonical ni og:url.
    siteUrl: '',

    // Endpoint HTTPS que recibe el formulario como JSON (POST).
    // Mientras esté vacío el formulario valida, pero no envía nada.
    contactEndpoint: '',

    // Texto libre para el pie (razón social, RFC, domicilio fiscal…).
    // Vacío = el bloque no se muestra.
    corporateInfo: '',

    locale: 'es-MX',
    currency: 'MXN',

    // Datos sintéticos de la demostración. No proceden de ningún sistema real.
    demo: Object.freeze({
      generatedOn: '2026-10-27',
      product: Object.freeze({
        name: 'Audífonos inalámbricos ANC 300',
        sku: 'AUD-ANC-300',
        category: 'Audio',
        currentPrice: 1899,
        unitCost: 1180,
        competitorMedian: 1949,
        competitorCount: 6,
        marginFloor: 0.25,
        priceRange: Object.freeze({ min: 1399, max: 2599, step: 10 }),
      }),
      // Unidades/mes = maxUnits / (1 + e^(sensitivity · (precio / mediana − 1) − offset))
      demand: Object.freeze({
        maxUnits: 1200,
        sensitivity: 4.5,
        offset: 0.5,
      }),
      priceHistory: Object.freeze({
        weeks: ['S32', 'S33', 'S34', 'S35', 'S36', 'S37', 'S38', 'S39', 'S40', 'S41', 'S42', 'S43'],
        own: [1999, 1999, 1949, 1949, 1949, 1899, 1899, 1899, 1899, 1899, 1899, 1899],
        competitor: [2049, 2029, 1999, 1989, 1979, 1969, 1959, 1949, 1999, 1979, 1959, 1949],
        events: Object.freeze([{ index: 8, label: 'Competidor C sin stock' }]),
      }),
      previousPeriod: Object.freeze({ price: 1949, units: 747 }),
    }),
  });
})();
