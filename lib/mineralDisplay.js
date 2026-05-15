/**
 * Format mineral price with unit and availability for app display.
 * Data comes from dashboard / master (API minerals).
 */

/** Treat API quirks: enabled may be boolean, string, or 1/0. */
export function isLimitedAvailabilityOn(av) {
  if (av == null) return false;
  if (typeof av === 'object' && !Array.isArray(av) && 'enabled' in av) {
    const e = av.enabled;
    return e === true || e === 'true' || e === 1 || e === '1';
  }
  return false;
}

/** Positive finite limited quantity from availability object, or null if not meaningful. */
export function getLimitedAvailabilityQty(av) {
  if (av == null || typeof av !== 'object' || Array.isArray(av)) return null;
  if (av.quantity == null) return null;
  const q = typeof av.quantity === 'number' ? av.quantity : parseFloat(String(av.quantity).replace(/,/g, ''));
  if (!Number.isFinite(q) || q <= 0) return null;
  return q;
}

export function parsePositiveQty(v) {
  if (v == null) return null;
  const q = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  if (!Number.isFinite(q) || q <= 0) return null;
  return q;
}

export function parseNonNegativeQty(v) {
  if (v == null) return null;
  const q = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  if (!Number.isFinite(q) || q < 0) return null;
  return q;
}

/**
 * Many listings store stock only on `availability.quantity` (or import aliases). The app reads `availableQuantity`.
 * Fill top-level fields when missing so cards show "100 kg" instead of "Available".
 */
export function withResolvedStock(mineral) {
  if (!mineral || typeof mineral !== 'object') return mineral;
  if (parseNonNegativeQty(mineral.availableQuantity) != null) return mineral;

  const av = mineral.availability;
  if (av && typeof av === 'object' && !Array.isArray(av)) {
    const q = typeof av.quantity === 'number' ? av.quantity : parseFloat(String(av.quantity ?? '').replace(/,/g, ''));
    if (Number.isFinite(q) && q > 0) {
      return {
        ...mineral,
        availableQuantity: q,
        availableQuantityUnit:
          (mineral.availableQuantityUnit && String(mineral.availableQuantityUnit).trim()) ||
          (av.unit && String(av.unit).trim()) ||
          (mineral.unit && String(mineral.unit).trim()) ||
          undefined,
      };
    }
  }

  const alt = mineral.available_quantity ?? mineral.stock ?? mineral.availabilityQty ?? mineral.quantityAvailable;
  const n = typeof alt === 'number' ? alt : parseFloat(String(alt ?? '').replace(/,/g, ''));
  if (Number.isFinite(n) && n > 0) {
    return {
      ...mineral,
      availableQuantity: n,
      availableQuantityUnit:
        (mineral.availableQuantityUnit && String(mineral.availableQuantityUnit).trim()) ||
        (mineral.unit && String(mineral.unit).trim()) ||
        undefined,
    };
  }
  return mineral;
}

/**
 * Max orderable quantity from dashboard for Buy flow (limited availability cap wins, else catalog availableQuantity).
 * @returns {{ max: number|null, capUnit: string|null, source: 'limited'|'catalog'|'none' }}
 */
export function getBuyMaxQuantityAndUnit(mineral) {
  if (!mineral) return { max: null, capUnit: null, source: 'none' };
  mineral = withResolvedStock(mineral);
  const av = mineral.availability;
  const limQ =
    av && typeof av === 'object' && !Array.isArray(av) ? parseNonNegativeQty(av.quantity) : null;
  if (isLimitedAvailabilityOn(av) && limQ != null) {
    const capUnit =
      typeof av === 'object' && av && av.unit && String(av.unit).trim()
        ? String(av.unit).trim()
        : null;
    return { max: limQ, capUnit: capUnit || 'units', source: 'limited' };
  }
  const aq = parseNonNegativeQty(mineral.availableQuantity);
  if (aq != null) {
    const capUnit =
      (mineral.availableQuantityUnit && String(mineral.availableQuantityUnit).trim()) ||
      (mineral.unit && String(mineral.unit).trim()) ||
      null;
    return { max: aq, capUnit: capUnit || 'units', source: 'catalog' };
  }
  return { max: null, capUnit: null, source: 'none' };
}

/**
 * Exact in-stock label for Quantity step (dashboard units — not the selected dropdown until they match).
 * @returns {{ text: string, max: number|null, capUnit: string|null, isPlaceholder?: boolean }}
 */
export function getInStockLabelForQuantityStep(mineral, defaultStock = '500', fallbackUnit = 'kg') {
  const { max, capUnit, source } = getBuyMaxQuantityAndUnit(mineral);
  if (source !== 'none' && max != null && capUnit) {
    return { text: `${max} ${capUnit}`, max, capUnit };
  }
  const fb = defaultStock != null && String(defaultStock).trim() !== '' ? String(defaultStock).trim() : '500';
  return { text: `${fb} ${fallbackUnit}`, max: null, capUnit: fallbackUnit, isPlaceholder: true };
}

/**
 * Hero / detail: second line under price — explicit available quantity from dashboard.
 * @returns {{ title: string, value: string }|null} null if nothing meaningful to add beyond generic "Available"
 */
export function getAvailableQuantityHeroLine(mineral) {
  if (!mineral) return null;
  mineral = withResolvedStock(mineral);
  const av = mineral.availability;
  const limQ =
    av && typeof av === 'object' && !Array.isArray(av) ? parseNonNegativeQty(av.quantity) : null;
  if (isLimitedAvailabilityOn(av) && limQ != null) {
    const u =
      typeof av === 'object' && av && av.unit && String(av.unit).trim()
        ? String(av.unit).trim()
        : 'units';
    return { title: 'Limited availability', value: `${limQ} ${u} only` };
  }
  const aq = parseNonNegativeQty(mineral.availableQuantity);
  if (aq != null) {
    const u =
      (mineral.availableQuantityUnit && String(mineral.availableQuantityUnit).trim()) ||
      (mineral.unit && String(mineral.unit).trim()) ||
      'units';
    return { title: 'Available quantity', value: `${aq} ${u}` };
  }
  if (isLimitedAvailabilityOn(av)) {
    return { title: 'Availability', value: 'Limited — see listing' };
  }
  return null;
}

/**
 * Price with unit (e.g. "$50,000/MT") or empty when no list price (market price not shown).
 * @param {object} mineral - Mineral from API (price or priceDisplay, unit)
 * @returns {string}
 */
export function formatPriceWithUnit(mineral) {
  if (!mineral) return '';
  const price = mineral.price ?? mineral.priceDisplay ?? '';
  const unit = mineral.unit && String(mineral.unit).trim() ? String(mineral.unit).trim().toUpperCase() : '';
  const raw = price != null && String(price).trim() ? String(price).trim() : '';
  if (!raw) return '';
  if (unit) return `${raw}/${unit}`;
  return raw;
}

/**
 * Availability text from dashboard (string or object { enabled, quantity, unit }, or availableQuantity + availableQuantityUnit).
 * @param {object} mineral - Mineral from API (availability, availableQuantity, availableQuantityUnit)
 * @returns {string} e.g. "100 kg available" or "Available"
 */
export function formatAvailability(mineral) {
  if (!mineral) return '';
  mineral = withResolvedStock(mineral);
  const av = mineral.availability;
  if (av != null && typeof av === 'string' && av.trim()) return av.trim();

  const availQty = parseNonNegativeQty(mineral.availableQuantity);
  const availUnit =
    (mineral.availableQuantityUnit && String(mineral.availableQuantityUnit).trim()) ||
    (typeof av === 'object' && av && av.unit && String(av.unit).trim()) ||
    'units';

  if (isLimitedAvailabilityOn(av)) {
    const limQ =
      av && typeof av === 'object' && !Array.isArray(av) ? parseNonNegativeQty(av.quantity) : null;
    if (limQ != null) {
      const u =
        (typeof av === 'object' && av && av.unit && String(av.unit).trim()) || availUnit;
      return `${limQ} ${u} available`;
    }
    // Toggle on but no positive limited qty: show catalog quantity if set
    if (availQty != null) return `${availQty} ${availUnit} available`;
    return 'Limited availability';
  }

  if (availQty != null) return `${availQty} ${availUnit} available`;
  return 'Available';
}

/**
 * In-stock quantity + unit for quantity selection (e.g. "100 kg").
 * Uses limited availability when it has a set qty; otherwise availableQuantity; else fallback.
 * @param {object} mineral - Mineral from API
 * @param {string} fallback - Fallback when no quantity set (e.g. "500" or "—")
 * @param {string} fallbackUnit - Unit when no unit set (e.g. "kg")
 * @returns {string} e.g. "100 kg" or "500 kg"
 */
export function getInStockQuantity(mineral, fallback = '500', fallbackUnit = 'kg') {
  if (!mineral) return `${fallback} ${fallbackUnit}`.trim();
  mineral = withResolvedStock(mineral);

  const availQty = parseNonNegativeQty(mineral.availableQuantity);
  const availUnit =
    (mineral.availableQuantityUnit && String(mineral.availableQuantityUnit).trim()) || fallbackUnit;

  const av = mineral.availability;
  if (isLimitedAvailabilityOn(av)) {
    const limQ =
      av && typeof av === 'object' && !Array.isArray(av) ? parseNonNegativeQty(av.quantity) : null;
    if (limQ != null) {
      const u = (typeof av === 'object' && av && av.unit && String(av.unit).trim()) || availUnit;
      return `${limQ} ${u}`;
    }
    if (availQty != null) return `${availQty} ${availUnit}`;
    return `${fallback} ${fallbackUnit}`.trim();
  }

  if (availQty != null) return `${availQty} ${availUnit}`;
  return `${fallback} ${fallbackUnit}`.trim();
}

/** App quantity-step tokens (Buy/Sell dropdowns). */
const CANONICAL_UNITS = ['ct', 'g', 'kg', 'MT'];
const UNIT_SORT_ORDER = ['ct', 'g', 'kg', 'MT'];

/**
 * Map API/dashboard unit strings to dropdown tokens (ct, g, kg, MT). Unknown units pass through trimmed.
 * @param {unknown} u
 * @returns {string|null}
 */
export function normalizeAppUnit(u) {
  if (u == null || u === '') return null;
  const s = String(u).trim();
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === 'grams' || v === 'gram' || v === 'g') return 'g';
  if (v === 'carat' || v === 'carats' || v === 'ct') return 'ct';
  if (v === 'kg' || v === 'kilogram' || v === 'kilograms' || v === 'kgs') return 'kg';
  if (v === 'ton' || v === 'tons' || v === 'mt' || v === 't' || v === 'metric ton' || v === 'metric tons') return 'MT';
  if (CANONICAL_UNITS.includes(s)) return s;
  return s;
}

/**
 * Unit the listing uses for stock/price: limited-availability unit, else catalog cap unit, else price/stock unit.
 * @param {object|null|undefined} mineral
 * @returns {string|null}
 */
export function getMineralPrimaryListingUnit(mineral) {
  if (!mineral || typeof mineral !== 'object') return null;
  const m = withResolvedStock(mineral);
  const av = m.availability;
  const limQ = getLimitedAvailabilityQty(av);
  if (isLimitedAvailabilityOn(av) && limQ != null && av && typeof av === 'object' && av.unit) {
    const raw = String(av.unit).trim();
    return normalizeAppUnit(raw) || raw;
  }
  const { max, capUnit } = getBuyMaxQuantityAndUnit(m);
  if (max != null && capUnit && String(capUnit).trim() && capUnit !== 'units') {
    const raw = String(capUnit).trim();
    return normalizeAppUnit(raw) || raw;
  }
  if (m.availableQuantityUnit && String(m.availableQuantityUnit).trim()) {
    const raw = String(m.availableQuantityUnit).trim();
    return normalizeAppUnit(raw) || raw;
  }
  if (m.unit && String(m.unit).trim()) {
    const raw = String(m.unit).trim();
    return normalizeAppUnit(raw) || raw;
  }
  return null;
}

function dedupeUnitsNormalized(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const raw = String(x).trim();
    if (!raw) continue;
    const key = normalizeAppUnit(raw) || raw;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function sortUnitsRest(arr) {
  return [...arr].sort((a, b) => {
    const ia = UNIT_SORT_ORDER.indexOf(a);
    const ib = UNIT_SORT_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return String(a).localeCompare(String(b));
  });
}

/**
 * Put the listing primary unit first; remaining options sorted (ct, g, kg, MT, then alpha).
 * If primary is not in baseOptions, it is prepended so the user can still match the listing.
 * @param {object|null|undefined} mineral
 * @param {string[]} baseOptions
 * @returns {string[]}
 */
export function orderUnitOptionsPrimaryFirst(mineral, baseOptions) {
  const base = Array.isArray(baseOptions) ? baseOptions.map((x) => String(x).trim()).filter(Boolean) : [];
  if (base.length === 0) return CANONICAL_UNITS.slice();
  const normalizedBase = dedupeUnitsNormalized(base);
  const primary = getMineralPrimaryListingUnit(mineral);
  const p = primary ? normalizeAppUnit(primary) || primary : null;
  const withoutPrimary = p ? normalizedBase.filter((u) => u !== p) : normalizedBase.slice();
  const rest = sortUnitsRest(withoutPrimary);
  if (!p) return sortUnitsRest(normalizedBase);
  if (normalizedBase.includes(p)) return [p, ...rest];
  return [p, ...rest];
}
