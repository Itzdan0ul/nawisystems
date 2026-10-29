(() => {
  'use strict';

  const Nawi = (window.Nawi = window.Nawi || {});

  // Modelo determinista y deliberadamente simple: no es Machine Learning ni una predicción real.
  const createDemandModel = ({ product, demand }) => {
    const { unitCost, competitorMedian, marginFloor, priceRange } = product;
    const { maxUnits, sensitivity, offset } = demand;

    const rawUnitsAt = (price) =>
      maxUnits / (1 + Math.exp(sensitivity * (price / competitorMedian - 1) - offset));

    const evaluate = (price) => {
      const units = Math.round(rawUnitsAt(price));
      const revenue = price * units;
      const grossProfit = (price - unitCost) * units;
      const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const elasticity = -sensitivity * (price / competitorMedian) * (1 - rawUnitsAt(price) / maxUnits);
      return { price, units, revenue, grossProfit, marginPct, elasticity };
    };

    const findOptimum = (metric) => {
      let best = evaluate(priceRange.min);
      for (let price = priceRange.min; price <= priceRange.max; price += priceRange.step) {
        const candidate = evaluate(price);
        if (candidate[metric] > best[metric]) best = candidate;
      }
      return best;
    };

    const floorPrice = unitCost / (1 - marginFloor);

    const curve = (points = 60) => {
      const span = priceRange.max - priceRange.min;
      return Array.from({ length: points + 1 }, (_, i) => {
        const price = priceRange.min + (span * i) / points;
        return { price, units: rawUnitsAt(price) };
      });
    };

    return {
      evaluate,
      findOptimum,
      floorPrice,
      curve,
      meetsFloor: (price) => price >= floorPrice,
    };
  };

  Nawi.createDemandModel = createDemandModel;
})();
