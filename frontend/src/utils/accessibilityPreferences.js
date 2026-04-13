export const FONT_SCALE_STORAGE_KEY = 'diana_font_scale';
export const DEFAULT_FONT_SCALE = 'comfortable';

export const FONT_SCALE_OPTIONS = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Base text size',
  },
  {
    value: 'comfortable',
    label: 'Comfortable',
    description: 'Slightly larger text',
  },
  {
    value: 'large',
    label: 'Large',
    description: 'Extra readable text',
  },
];

const validFontScales = new Set(FONT_SCALE_OPTIONS.map(option => option.value));

export const isValidFontScale = value => validFontScales.has(value);

export const getStoredFontScale = () => {
  if (typeof window === 'undefined') return DEFAULT_FONT_SCALE;

  const storedValue = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
  return isValidFontScale(storedValue) ? storedValue : DEFAULT_FONT_SCALE;
};

export const persistFontScalePreference = value => {
  if (typeof window === 'undefined') return;

  const nextValue = isValidFontScale(value) ? value : DEFAULT_FONT_SCALE;
  window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, nextValue);
};

export const applyFontScalePreference = value => {
  if (typeof document === 'undefined') return;

  const nextValue = isValidFontScale(value) ? value : DEFAULT_FONT_SCALE;
  document.documentElement.dataset.fontScale = nextValue;
};
