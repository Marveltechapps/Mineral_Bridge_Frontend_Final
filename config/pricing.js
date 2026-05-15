/**
 * Confirmed-pricing mode: app shows "Price pending" until dashboard sets confirmedPrice / order summary.
 * Set to false to restore legacy estimated totals (totalDue, subtotal, amount).
 * For full revert, also set backend USE_CONFIRMED_PRICE_AUTHORITY=false and
 * dashboard VITE_USE_CONFIRMED_PRICE_AUTHORITY=false.
 */
export const USE_CONFIRMED_PRICE_AUTHORITY = true;

/**
 * When true, Order history / Transaction history / detail screens show the full Price Confirmed
 * breakdown from the dashboard (subtotal, tax, transport, platform fee, total due).
 * Set false to revert to single-line amounts only (legacy list/detail behavior).
 */
export const SHOW_APP_ORDER_PRICE_BREAKDOWN = true;
