/* The ten crops the model supports. Order matches the training set grouping. */
export const CROPS = [
  { id: "Apple", label: "Apple", label_np: "स्याउ" },
  { id: "Banana", label: "Banana", label_np: "केरा" },
  { id: "Citrus", label: "Citrus", label_np: "सुन्तला" },
  { id: "Cucumber", label: "Cucumber", label_np: "काँक्रो" },
  { id: "Grape", label: "Grape", label_np: "अंगुर" },
  { id: "Maize", label: "Maize", label_np: "मकै" },
  { id: "Mango", label: "Mango", label_np: "आँप" },
  { id: "Potato", label: "Potato", label_np: "आलु" },
  { id: "Rice", label: "Rice", label_np: "धान" },
  { id: "Tomato", label: "Tomato", label_np: "गोलभेँडा" },
];

export const cropLabel = (c, lang) =>
  (lang === "np" && c?.label_np) || c?.label || "";

export const cropName = (id, lang) => {
  const c = CROPS.find((x) => x.id === id);
  return c ? cropLabel(c, lang) : id;
};

export const CROP_IDS = CROPS.map((c) => c.id);

/* Sentinel for "I don't know the crop / just classify this leaf".
   Chosen so it can never collide with a real crop id. Diagnose sends no
   crop_type to the API for this value, which disables the crop-mismatch
   warning while leaving the prediction itself unchanged. */
export const CROP_ANY = "__any__";
