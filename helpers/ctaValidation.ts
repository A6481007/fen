export type EmailValidationResult = {
  isValid: boolean;
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (input: string): EmailValidationResult => {
  const trimmed = input.trim();

  if (!trimmed) {
    return { isValid: false, message: "Email is required." };
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return { isValid: false, message: "Please enter a valid email address." };
  }

  return { isValid: true };
};

export const isValidEmail = (input: string): boolean => validateEmail(input).isValid;
