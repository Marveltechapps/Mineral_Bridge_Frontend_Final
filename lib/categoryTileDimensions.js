/**
 * Shared image frame for Buy category grids (main categories, sub-category mineral lists).
 * Base shape: 5:4 (w:h). Image area ~3% taller than 5:4 at the same width.
 */
export const CATEGORY_TILE_BASE_ASPECT_NUMERATOR = 5;
export const CATEGORY_TILE_BASE_ASPECT_DENOMINATOR = 4;

/** width / height — image ~3% taller than 5:4 at the same width */
export const CATEGORY_TILE_IMAGE_ASPECT_RATIO =
  CATEGORY_TILE_BASE_ASPECT_NUMERATOR / (CATEGORY_TILE_BASE_ASPECT_DENOMINATOR * 1.03);
