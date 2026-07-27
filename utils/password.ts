export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }

  if (password && password.length > 128) {
    errors.push("Password must be at most 128 characters");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
}

export function validateName(name: string): string | null {
  if (!name || name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }
  if (name.trim().length > 50) {
    return "Name must be at most 50 characters";
  }
  return null;
}

