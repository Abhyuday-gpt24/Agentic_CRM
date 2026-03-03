// utils/validation.ts

export const isValidEmail = (email: string): boolean => {
  // Standard Regex for validating email format (e.g., name@domain.com)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
