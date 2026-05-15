/**
 * Minerals data – one file per mineral (gold.js, silver.js, etc.).
 * Use Gold as reference. Merge with API mineral when entering sell flow so
 * Mineral Details → Logistics → Settlement → Sale Confirmed use consistent details.
 */

import gold from './gold';
import silver from './silver';
import diamond from './diamond';
import emerald from './emerald';
import ruby from './ruby';
import tanzanite from './tanzanite';
import opal from './opal';
import copper from './copper';
import nickel from './nickel';
import cobalt from './cobalt';
import limestone from './limestone';
import quartz from './quartz';
import lithium from './lithium';
import uranium from './uranium';

const MINERALS_MAP = {
  gold,
  silver,
  diamond,
  diamonds: diamond,
  emerald,
  ruby,
  tanzanite,
  opal,
  copper,
  nickel,
  cobalt,
  limestone,
  quartz,
  lithium,
  uranium,
};

/** All mineral ids (from gold.js reference shape) */
export const MINERAL_IDS = Object.keys(MINERALS_MAP).filter((k) => !['diamonds'].includes(k));

/**
 * Get mineral details from local files by id or name (case-insensitive).
 * @param {string} idOrName - e.g. 'gold', 'Gold', 'diamond'
 * @returns {object|undefined} Mineral detail object or undefined
 */
export function getMineralDetails(idOrName) {
  if (!idOrName || typeof idOrName !== 'string') return undefined;
  const key = idOrName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return MINERALS_MAP[key] || undefined;
}

/**
 * All mineral detail objects (one per mineral file).
 */
export function getAllMineralDetails() {
  return MINERAL_IDS.map((id) => MINERALS_MAP[id]);
}

/**
 * Merge API mineral with local file details. Local file wins for id, name, category, image,
 * acceptedFormats, defaultUnit, defaultAcceptedFormat; API can fill missing fields.
 * Use this when navigating to SellIntro so the whole sell flow gets one mineral object.
 * @param {object} apiMineral - Mineral from API (id, name, category, image/imageUrl, ...)
 * @returns {object} Mineral object for sell flow (Mineral Details → Order Confirmed)
 */
export function mergeMineralWithDetails(apiMineral) {
  if (!apiMineral) return apiMineral;
  const id = apiMineral.id || (apiMineral._id && String(apiMineral._id)) || apiMineral.name;
  const details = getMineralDetails(id || apiMineral.name);
  if (!details) {
    return {
      ...apiMineral,
      id: apiMineral.id || (apiMineral._id && String(apiMineral._id)),
      image: apiMineral.image || apiMineral.imageUrl,
      acceptedFormats: ['Raw', 'Semi-Processed', 'Processed'],
      defaultUnit: 'grams',
      defaultAcceptedFormat: 'Raw',
    };
  }
  return {
    ...details,
    ...apiMineral,
    id: details.id || apiMineral.id || (apiMineral._id && String(apiMineral._id)),
    name: details.name || apiMineral.name,
    category: details.category || apiMineral.category,
    image: apiMineral.image || apiMineral.imageUrl || details.image,
    acceptedFormats: details.acceptedFormats,
    defaultUnit: details.defaultUnit,
    defaultAcceptedFormat: details.defaultAcceptedFormat,
  };
}

export default MINERALS_MAP;
