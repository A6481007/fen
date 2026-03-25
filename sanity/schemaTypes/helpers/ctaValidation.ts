type CtaValidationOptions = {
  isPrimary?: boolean;
  minLength?: number;
  maxLength?: number;
};

const DEFAULT_PRIMARY_MAX = 28;
const DEFAULT_SECONDARY_MAX = 36;
const DEFAULT_MIN = 2;

const isEmpty = (value?: string) => !value || !value.trim();

export const validateCtaLabel = (value?: string, options: CtaValidationOptions = {}) => {
  if (isEmpty(value)) return true;

  const trimmed = value?.trim() || "";
  const minLength = options.minLength ?? DEFAULT_MIN;
  const maxLength = options.maxLength ?? (options.isPrimary ? DEFAULT_PRIMARY_MAX : DEFAULT_SECONDARY_MAX);

  if (trimmed.length < minLength) {
    return `CTA label should be at least ${minLength} characters.`;
  }

  if (trimmed.length > maxLength) {
    return `CTA label should be ${maxLength} characters or fewer.`;
  }

  if (/[.!?]$/.test(trimmed)) {
    return "CTA labels should not end with punctuation.";
  }

  return true;
};
