/**
 * Validations for Artisanal onboarding flow (screens 1–7).
 * Ensures user enters valid data before proceeding; messages shown via Alert.
 *
 * Mineral types: shared JSON catalog (~200) + local sell-flow minerals + optional names from GET /api/minerals (dashboard catalog).
 */

import { getAllMineralDetails } from '../data/minerals';
import ARTISANAL_MINERAL_CATALOG from '../data/artisanalMineralCatalog.json';

const LEGACY_APP_MINERAL_NAMES = [
  'Gold',
  'Silver',
  'Diamonds',
  'Emerald',
  'Ruby',
  'Tanzanite',
  'Black & Fire Opal',
  'Black Opal',
  'Fire Opal',
  'Copper',
  'Nickel',
  'Cobalt',
  'Limestone',
  'Quartz',
  'Lithium',
  'Uranium',
];

function addToMapFirstWins(map, raw) {
  const t = String(raw || '').trim();
  if (!t) return;
  const lower = t.toLowerCase();
  if (!map.has(lower)) map.set(lower, t);
}

function applyMineralAliases(map) {
  const opalCanon = map.get('black & fire opal') || map.get('opal') || 'Opal';
  map.set('black opal', opalCanon);
  map.set('fire opal', opalCanon);
  if (!map.has('diamonds')) {
    const d = map.get('diamond (rough)') || map.get('diamond (polished)');
    if (d) map.set('diamonds', d);
  }
}

function buildStaticMineralLookup() {
  const map = new Map();
  for (const m of getAllMineralDetails()) {
    if (m?.name) addToMapFirstWins(map, m.name);
  }
  if (Array.isArray(ARTISANAL_MINERAL_CATALOG)) {
    for (const n of ARTISANAL_MINERAL_CATALOG) addToMapFirstWins(map, n);
  }
  for (const n of LEGACY_APP_MINERAL_NAMES) addToMapFirstWins(map, n);
  applyMineralAliases(map);
  return map;
}

const STATIC_MINERAL_LOOKUP = buildStaticMineralLookup();

/**
 * All display options for artisanal step 3: static catalog + optional dashboard mineral names (deduped, sorted).
 * @param {string[]} [dashboardMineralNames] - `name` from GET /api/minerals
 */
export function mergeArtisanalMineralDisplayOptions(dashboardMineralNames = []) {
  const seen = new Set();
  const out = [];
  const push = (raw) => {
    const t = String(raw || '').trim();
    if (!t) return;
    const lower = t.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    out.push(t);
  };
  for (const m of getAllMineralDetails()) {
    if (m?.name) push(m.name);
  }
  if (Array.isArray(ARTISANAL_MINERAL_CATALOG)) {
    for (const n of ARTISANAL_MINERAL_CATALOG) push(n);
  }
  for (const n of dashboardMineralNames) push(n);
  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return out;
}

/** @deprecated Use mergeArtisanalMineralDisplayOptions([]) */
export const ARTISANAL_MINERAL_TYPE_OPTIONS = mergeArtisanalMineralDisplayOptions([]);

/** @deprecated Use mergeArtisanalMineralDisplayOptions */
export const VALID_MINERAL_NAMES = ARTISANAL_MINERAL_TYPE_OPTIONS;

/**
 * @param {string} name
 * @param {{ dashboardMineralNames?: string[] }} [options] - names from GET /api/minerals so dashboard-only minerals validate offline after fetch
 */
export function validateMineralName(name, options = {}) {
  const { dashboardMineralNames = [] } = options;
  const trimmed = (name || '').trim();
  if (!trimmed) return { valid: false, message: 'Please enter a mineral name.' };

  const lower = trimmed.toLowerCase();
  const fromStatic = STATIC_MINERAL_LOOKUP.get(lower);
  if (fromStatic) return { valid: true, value: fromStatic };

  for (const n of dashboardMineralNames) {
    const t = String(n || '').trim();
    if (t && t.toLowerCase() === lower) return { valid: true, value: t };
  }

  return {
    valid: false,
    message:
      'Use an approved mineral name (institutional catalog or marketplace). Spelling must match; the server checks this when your profile is saved.',
  };
}

export function validateYearsExperience(value) {
  const str = String(value || '').trim();
  if (!str) return { valid: false, message: 'Please enter years of experience.' };
  const num = parseInt(str, 10);
  if (Number.isNaN(num) || num < 0)
    return { valid: false, message: 'Enter a valid number (0 or more).' };
  return { valid: true, value: num };
}

/** Step 3: years of experience — omit or empty is allowed. */
export function validateOptionalYearsExperience(value) {
  const str = String(value || '').trim();
  if (!str) return { valid: true, value: null };
  return validateYearsExperience(str);
}

/** Step 3: workforce — omit or empty is allowed. */
export function validateOptionalNumberOfWorkersStr(value) {
  const str = String(value || '').trim();
  if (!str) return { valid: true, value: null };
  return validateNumberOfWorkers(Number(str));
}

/** Step 3: mandatory typical / declared quantity for the mineral (same numeric rules as monthly output). */
export function validateOperationQuantity(value) {
  const str = String(value || '').trim();
  if (!str) return { valid: false, message: 'Please enter quantity.' };
  const num = parseFloat(str);
  if (Number.isNaN(num) || num <= 0)
    return { valid: false, message: 'Enter a quantity greater than 0.' };
  return { valid: true, value: num };
}

export function validateNumberOfWorkers(value) {
  const num = value != null ? Number(value) : NaN;
  if (Number.isNaN(num) || num < 0)
    return { valid: false, message: 'Number of workers must be 0 or more.' };
  return { valid: true, value: Math.floor(num) };
}

export function validateMonthlyOutput(value) {
  const str = String(value || '').trim();
  if (!str) return { valid: false, message: 'Please enter estimated monthly output.' };
  const num = parseFloat(str);
  if (Number.isNaN(num) || num <= 0)
    return { valid: false, message: 'Enter a valid amount greater than 0.' };
  return { valid: true, value: num };
}

/** Allowed output units: ct (carat), g (grams), kg (kilograms), MT (metric tons). Same as buy/sell screens. */
const VALID_OUTPUT_UNITS = ['ct', 'g', 'kg', 'MT'];

export function validateOutputUnit(unit) {
  const raw = (unit || '').trim();
  const u = raw.toLowerCase();
  if (!raw) return { valid: false, message: 'Please select an output unit (carat, grams, kilograms, metric tons).' };
  // Normalize "tons"/"ton" to MT for backward compatibility
  const normalized = u === 'tons' || u === 'ton' ? 'MT' : (u === 'mt' ? 'MT' : u);
  if (!VALID_OUTPUT_UNITS.includes(normalized))
    return { valid: false, message: 'Select a valid unit: carat, grams, kilograms, or metric tons.' };
  return { valid: true, value: normalized };
}

export function validateLocation(country, stateProvince, district, village) {
  if (!(country || '').trim()) return { valid: false, message: 'Please select a country.' };
  if (!(stateProvince || '').trim()) return { valid: false, message: 'Please select a state/province.' };
  if (!(district || '').trim()) return { valid: false, message: 'Please select a district.' };
  if (!(village || '').trim()) return { valid: false, message: 'Please enter village/town name.' };
  return {
    valid: true,
    value: {
      country: country.trim(),
      stateProvince: stateProvince.trim(),
      district: district.trim(),
      village: village.trim(),
    },
  };
}

export function validateChildLaborAccepted(accepted) {
  if (!accepted)
    return { valid: false, message: 'You must accept the child labor prohibition declaration to continue.' };
  return { valid: true };
}

export function validateLicenseUpload(licenseUri) {
  // License can be optional; if required uncomment:
  // if (!licenseUri) return { valid: false, message: 'Please upload your mining license.' };
  return { valid: true };
}
