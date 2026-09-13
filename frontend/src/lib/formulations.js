/* Pesticide formulation codes -> the physical form the product is sold in.
   WP/SP/WG are powders, EC/SL/SC/OL are liquids, G is granules. Kept here (not
   in the icon component) so it is plain data, importable without pulling in a
   React component. */
export const POWDER = "powder";
export const LIQUID = "liquid";
export const GRANULE = "granule";

export const FORM_SHAPE = {
  WP: POWDER, SP: POWDER, WG: POWDER,
  EC: LIQUID, SL: LIQUID, SC: LIQUID, OL: LIQUID,
  G: GRANULE,
};

export const SHAPE_KEYS = {
  [POWDER]: "formShapePowder",
  [LIQUID]: "formShapeLiquid",
  [GRANULE]: "formShapeGranule",
};
