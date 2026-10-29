(() => {
  'use strict';

  const { config, charts, createDemandModel } = window.Nawi;
  const { demo } = config;

  const currency = new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.currency, maximumFractionDigits: 0 });
  const integer = new Intl.NumberFormat(config.locale, { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat(config.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const twoDecimals = new Intl.NumberFormat(config.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateFormat = new Intl.DateTimeFormat(config.locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  const formatPrice = (value) => currency.format(value);
  const formatPct = (value) => `${decimal.format(value)} %`;
  const formatMillions = (value) => `$${twoDecimals.format(value / 1e6)} M`;
  const formatSigned = (value, formatter) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatter(Math.abs(value))}`;
  const pctChange = (next, base) => (base ? ((next - base) / base) * 100 : 0);

  const setText = (root, selector, text) => {
    root.querySelectorAll(selector).forEach((el) => {
      el.textContent = text;
    });
  };

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const model = createDemandModel(demo);
  const { product } = demo;
  const baseline = model.evaluate(product.currentPrice);
  const scenarios = {
    current: baseline,
    match: model.evaluate(product.competitorMedian),
    revenue: model.findOptimum('revenue'),
    profit: model.findOptimum('grossProfit'),
  };

  const applyBrand = () => {
    setText(document, '[data-brand="product"]', config.brand.product);
    setText(document, '[data-brand="company"]', config.brand.company);
    setText(document, '[data-demo="product-name"]', product.name);
    setText(document, '[data-demo="sku"]', product.sku);
    setText(document, '[data-demo="cost"]', formatPrice(product.unitCost));
    setText(document, '[data-demo="competitor"]', formatPrice(product.competitorMedian));
    setText(document, '[data-demo="floor-pct"]', `${integer.format(product.marginFloor * 100)} %`);
    setText(document, '[data-demo="floor-price"]', formatPrice(Math.ceil(model.floorPrice)));

    document.querySelectorAll('[data-demo="generated"]').forEach((el) => {
      el.dateTime = demo.generatedOn;
      el.textContent = dateFormat.format(new Date(`${demo.generatedOn}T00:00:00Z`));
    });

    const year = String(new Date().getFullYear());
    setText(document, '[data-current-year]', year);

    const corporate = document.querySelector('[data-corporate-info]');
    if (corporate && config.corporateInfo) {
      corporate.textContent = config.corporateInfo;
      corporate.hidden = false;
    }

    if (config.siteUrl) {
      const url = `${config.siteUrl}/`;
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = url;
      const ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      ogUrl.content = url;
      document.head.append(canonical, ogUrl);
    }
  };

  const initNavigation = () => {
    const toggle = document.querySelector('[data-nav-toggle]');
    const nav = document.querySelector('[data-nav]');
    if (!toggle || !nav) return;

    const label = toggle.querySelector('.nav-toggle__label');
    const icon = toggle.querySelector('use');
    const desktop = window.matchMedia('(min-width: 60em)');

    const setOpen = (open, { returnFocus = false } = {}) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('site-nav--open', open);
      document.body.classList.toggle('has-open-nav', open);
      label.textContent = open ? 'Cerrar' : 'Menú';
      icon.setAttribute('href', open ? '#icon-close' : '#icon-menu');
      if (!open && returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, { returnFocus: true });
    });
    desktop.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  };

  const setTrend = (el, change, text) => {
    if (!el) return;
    const direction = change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'neutral';
    el.classList.remove('trend--up', 'trend--down', 'trend--neutral');
    el.classList.add(`trend--${direction}`);
    const span = el.querySelector('span');
    if (span) span.textContent = text;
    const use = el.querySelector('use');
    if (use) use.setAttribute('href', direction === 'down' ? '#icon-down' : '#icon-up');
  };

  const initHeroDashboard = () => {
    const root = document.querySelector('.product-dashboard');
    if (!root) return;

    const previous = model.evaluate(demo.previousPeriod.price);
    const gap = pctChange(product.currentPrice, product.competitorMedian);
    const unitsChange = pctChange(baseline.units, demo.previousPeriod.units);
    const revenueChange = pctChange(baseline.revenue, demo.previousPeriod.price * demo.previousPeriod.units);
    const marginChange = baseline.marginPct - previous.marginPct;

    setText(root, '[data-kpi="price"]', formatPrice(baseline.price));
    setText(root, '[data-kpi="competitor"]', formatPrice(product.competitorMedian));
    setText(root, '[data-kpi="price-gap"]', `${formatPct(Math.abs(gap))} ${gap <= 0 ? 'bajo' : 'sobre'} la mediana`);
    setText(root, '[data-kpi="competitor-count"]', `Mediana de ${product.competitorCount} tiendas`);
    setText(root, '[data-kpi="units"]', integer.format(baseline.units));
    setText(root, '[data-kpi="revenue"]', formatMillions(baseline.revenue));
    setText(root, '[data-kpi="margin"]', formatPct(baseline.marginPct));
    setTrend(root.querySelector('[data-kpi="units-trend"]'), unitsChange, formatPct(Math.abs(unitsChange)));
    setTrend(root.querySelector('[data-kpi="revenue-trend"]'), revenueChange, formatPct(Math.abs(revenueChange)));
    setTrend(root.querySelector('[data-kpi="margin-trend"]'), marginChange, `${decimal.format(Math.abs(marginChange))} pts`);

    const best = scenarios.profit;
    setText(
      root,
      '[data-kpi="insight"]',
      `Escenario sugerido: ${formatPrice(best.price)}. Beneficio bruto estimado ${formatSigned(pctChange(best.grossProfit, baseline.grossProfit), formatPct)} con ${formatPct(Math.abs(pctChange(best.units, baseline.units)))} ${best.units < baseline.units ? 'menos' : 'más'} unidades. Requiere aprobación del equipo comercial.`
    );

    const { priceHistory } = demo;
    const priceContainer = root.querySelector('[data-chart="price-history"]');
    if (priceContainer) {
      charts.lineChart(priceContainer, {
        categories: priceHistory.weeks,
        series: [
          { label: 'Tu precio', values: priceHistory.own, modifier: 'own' },
          { label: 'Mediana competencia', values: priceHistory.competitor, modifier: 'competitor' },
        ],
        events: priceHistory.events,
        formatValue: formatPrice,
        labelledBy: 'hero-price-title',
      });
    }

    const demandContainer = root.querySelector('[data-chart="hero-demand"]');
    if (demandContainer) {
      charts.demandChart(demandContainer, {
        curve: model.curve(),
        range: product.priceRange,
        floorPrice: model.floorPrice,
        competitorPrice: product.competitorMedian,
        markers: [
          { price: baseline.price, units: baseline.units, modifier: 'current' },
          { price: best.price, units: best.units, modifier: 'optimum' },
        ],
        formatPrice,
        formatUnits: (v) => integer.format(v),
        labelledBy: 'hero-demand-title',
      });
    }
  };

  const initPricingDemo = () => {
    const root = document.querySelector('[data-pricing-demo]');
    if (!root) return;

    const range = root.querySelector('[data-price-range]');
    const input = root.querySelector('[data-price-input]');
    const ruleStatus = root.querySelector('[data-rule-status]');
    const ruleText = ruleStatus.querySelector('.rule-status__text');
    const ruleIcon = ruleStatus.querySelector('use');
    const live = root.querySelector('[data-demo-live]');
    const tbody = root.querySelector('[data-comparison-body]');
    const scenarioButtons = [...root.querySelectorAll('[data-scenario]')];
    const { min, max, step } = product.priceRange;
    const floorPct = `${integer.format(product.marginFloor * 100)} %`;

    [range, input].forEach((control) => {
      control.min = String(min);
      control.max = String(max);
      control.step = String(step);
    });
    setText(root, '[data-price-hint]', `Entre ${formatPrice(min)} y ${formatPrice(max)} MXN, en pasos de ${formatPrice(step)}.`);

    const clampPrice = (value) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      return Math.min(max, Math.max(min, min + Math.round((n - min) / step) * step));
    };

    let chart = null;
    let liveTimer = 0;

    const describeDelta = (value, base, formatter) => {
      const diff = value - base;
      if (Math.abs(diff) < 1e-9) return { text: 'Igual que el precio actual', direction: 'neutral' };
      return {
        text: `${formatSigned(diff, formatter)} vs. precio actual`,
        direction: diff > 0 ? 'up' : 'down',
      };
    };

    const setDelta = (key, delta) => {
      const el = root.querySelector(`[data-delta="${key}"]`);
      el.textContent = delta.text;
      el.classList.remove('demo-kpis__delta--up', 'demo-kpis__delta--down');
      if (delta.direction !== 'neutral') el.classList.add(`demo-kpis__delta--${delta.direction}`);
    };

    const scenarioRow = (label, result, highlighted) => {
      const row = document.createElement('tr');
      row.className = highlighted ? 'comparison__row comparison__row--active' : 'comparison__row';
      const head = document.createElement('th');
      head.className = 'comparison__cell comparison__cell--label';
      head.scope = 'row';
      head.textContent = label;
      const meets = model.meetsFloor(result.price);
      const cells = [
        formatPrice(result.price),
        integer.format(result.units),
        formatPrice(result.revenue),
        formatPrice(result.grossProfit),
        formatPct(result.marginPct),
      ].map((text) => {
        const td = document.createElement('td');
        td.className = 'comparison__cell';
        td.textContent = text;
        return td;
      });
      const rule = document.createElement('td');
      rule.className = 'comparison__cell comparison__cell--text';
      const badge = document.createElement('span');
      badge.className = `status ${meets ? 'status--ok' : 'status--alert'}`;
      badge.textContent = meets ? 'Cumple' : 'No cumple';
      rule.appendChild(badge);
      row.append(head, ...cells, rule);
      return row;
    };

    const renderComparison = (current) => {
      const rows = [
        ['Precio actual', scenarios.current],
        ['Igualar competencia', scenarios.match],
        ['Máx. ingreso estimado', scenarios.revenue],
        ['Máx. beneficio estimado', scenarios.profit],
        ['Tu escenario', current],
      ].map(([label, result], i, list) => scenarioRow(label, result, i === list.length - 1));
      tbody.replaceChildren(...rows);
    };

    const update = (price, { announce = true } = {}) => {
      const result = model.evaluate(price);
      range.value = String(price);
      if (document.activeElement !== input) input.value = String(price);
      range.style.setProperty('--fill', `${((price - min) / (max - min)) * 100}%`);

      setText(root, '[data-output="units"]', integer.format(result.units));
      setText(root, '[data-output="revenue"]', formatPrice(result.revenue));
      setText(root, '[data-output="profit"]', formatPrice(result.grossProfit));
      setText(root, '[data-output="margin"]', formatPct(result.marginPct));
      setText(root, '[data-output="elasticity"]', formatSigned(result.elasticity, (v) => twoDecimals.format(v)));
      setText(root, '[data-output="elasticity-abs"]', decimal.format(Math.abs(result.elasticity)));

      setDelta('units', describeDelta(result.units, baseline.units, (v) => integer.format(v)));
      setDelta('revenue', describeDelta(result.revenue, baseline.revenue, formatPrice));
      setDelta('profit', describeDelta(result.grossProfit, baseline.grossProfit, formatPrice));
      setDelta('margin', describeDelta(result.marginPct, baseline.marginPct, (v) => `${decimal.format(v)} pts`));

      const meets = model.meetsFloor(price);
      ruleStatus.classList.toggle('rule-status--ok', meets);
      ruleStatus.classList.toggle('rule-status--alert', !meets);
      ruleIcon.setAttribute('href', meets ? '#icon-check' : '#icon-alert');
      ruleText.textContent = meets
        ? `Cumple el margen piso del ${floorPct}.`
        : `Por debajo del margen piso del ${floorPct}. Con las reglas actuales, este precio no podría aprobarse.`;

      scenarioButtons.forEach((button) => {
        button.setAttribute('aria-pressed', String(scenarios[button.dataset.scenario].price === price));
      });

      renderComparison(result);
      if (chart) chart.select(price, result.units);

      if (announce) {
        clearTimeout(liveTimer);
        liveTimer = setTimeout(() => {
          live.textContent = `Precio ${formatPrice(price)}: ${integer.format(result.units)} unidades, ingresos ${formatPrice(result.revenue)}, beneficio bruto ${formatPrice(result.grossProfit)}, margen ${formatPct(result.marginPct)}.${meets ? '' : ' Por debajo del margen piso.'}`;
        }, 600);
      }
    };

    const chartContainer = root.querySelector('[data-chart="demo-demand"]');
    if (chartContainer) {
      chart = charts.demandChart(chartContainer, {
        curve: model.curve(80),
        range: product.priceRange,
        floorPrice: model.floorPrice,
        competitorPrice: product.competitorMedian,
        markers: [{ price: baseline.price, units: baseline.units, modifier: 'current', label: 'Actual' }],
        formatPrice,
        formatUnits: (v) => integer.format(v),
        labelledBy: 'demo-chart-title',
        onSelect: (price) => update(price),
      });
    }

    range.addEventListener('input', () => update(Number(range.value)));
    input.addEventListener('change', () => {
      const price = clampPrice(input.value);
      update(price ?? baseline.price);
      input.value = range.value;
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        input.dispatchEvent(new Event('change'));
      }
    });
    scenarioButtons.forEach((button) => {
      button.addEventListener('click', () => update(scenarios[button.dataset.scenario].price));
    });

    update(baseline.price, { announce: false });
  };

  const initContactLinks = () => {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;
    const reason = form.elements.namedItem('reason');
    const name = form.elements.namedItem('name');

    document.querySelectorAll('[data-contact-reason]').forEach((link) => {
      link.addEventListener('click', () => {
        reason.value = link.dataset.contactReason;
        reason.dispatchEvent(new Event('change'));
        const focusTarget = name.value ? reason : name;
        window.setTimeout(() => focusTarget.focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 450);
      });
    });
  };

  const initContactForm = () => {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;

    const status = form.querySelector('[data-form-status]');
    const submit = form.querySelector('[data-submit]');
    const submitLabel = submit.textContent;
    const fields = ['reason', 'name', 'company', 'email', 'message'].map((n) => form.elements.namedItem(n));
    let attempted = false;

    const messageFor = (field) => {
      const v = field.validity;
      if (v.valueMissing || (field.required && !field.value.trim())) {
        return {
          reason: 'Elige el motivo de tu solicitud.',
          name: 'Escribe tu nombre.',
          company: 'Escribe el nombre de tu empresa.',
          email: 'Escribe tu correo de trabajo.',
          message: 'Cuéntanos qué quieres resolver.',
        }[field.name];
      }
      if (v.typeMismatch) return 'Escribe un correo válido, por ejemplo nombre@empresa.com.';
      if (v.tooShort) return `Agrega un poco más de detalle: mínimo ${field.minLength} caracteres.`;
      if (v.tooLong) return `Reduce el texto: máximo ${field.maxLength} caracteres.`;
      return '';
    };

    const validateField = (field) => {
      const message = messageFor(field);
      const error = document.getElementById(`${field.id}-error`);
      field.setAttribute('aria-invalid', String(Boolean(message)));
      if (error) {
        error.textContent = message;
        error.hidden = !message;
      }
      return !message;
    };

    const showStatus = (type, text) => {
      status.className = `form-status form-status--${type}`;
      status.textContent = text;
      status.hidden = false;
    };

    fields.forEach((field) => {
      const handler = () => {
        if (attempted || field.getAttribute('aria-invalid') === 'true') validateField(field);
      };
      field.addEventListener('input', handler);
      field.addEventListener('change', handler);
      field.addEventListener('blur', handler);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      attempted = true;
      const invalid = fields.filter((field) => !validateField(field));
      if (invalid.length) {
        showStatus('error', invalid.length === 1 ? 'Revisa el campo marcado.' : `Revisa los ${invalid.length} campos marcados.`);
        invalid[0].focus();
        return;
      }

      if (form.elements.namedItem('website').value) return;

      if (!config.contactEndpoint) {
        showStatus(
          'warning',
          'Tu solicitud no se envió: este formulario todavía no está conectado a un sistema de recepción. Lo que escribiste sigue en el formulario.'
        );
        return;
      }

      const payload = Object.fromEntries(
        [...new FormData(form).entries()].filter(([key]) => key !== 'website').map(([key, value]) => [key, String(value).trim()])
      );
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      submit.disabled = true;
      submit.textContent = 'Enviando…';
      form.setAttribute('aria-busy', 'true');
      showStatus('info', 'Enviando tu solicitud…');

      try {
        const response = await fetch(config.contactEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...payload, source: 'landing', product: config.brand.product }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        form.reset();
        attempted = false;
        fields.forEach((field) => field.removeAttribute('aria-invalid'));
        showStatus('success', 'Recibimos tu solicitud. Te contactaremos por correo para coordinar la sesión.');
      } catch (error) {
        showStatus(
          'error',
          error.name === 'AbortError'
            ? 'El envío tardó demasiado y se canceló. Revisa tu conexión e inténtalo de nuevo.'
            : 'No pudimos enviar tu solicitud. Inténtalo de nuevo en unos minutos; tus datos siguen en el formulario.'
        );
      } finally {
        clearTimeout(timeout);
        submit.disabled = false;
        submit.textContent = submitLabel;
        form.removeAttribute('aria-busy');
      }
    });
  };

  applyBrand();
  initNavigation();
  initHeroDashboard();
  initPricingDemo();
  initContactLinks();
  initContactForm();
})();
