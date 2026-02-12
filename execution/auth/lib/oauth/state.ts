import { randomBytes } from 'crypto';

/**
 * Generates a random state string with a timestamp suffix.
 * Structure: <random-hex>.<timestamp>
 */
export function generateOAuthState(): string {
  const random = randomBytes(32).toString('hex');
  const timestamp = Date.now().toString();
  return `${random}.${timestamp}`;
}

/**
 * Validates an OAuth state string.
 * Checks format and expiration (default 5 minutes).
 * 
 * @param state The state string to validate
 * @param validityInMinutes Duration in minutes the state is valid for (default: 5)
 */
export function validateOAuthState(state: string, validityInMinutes: number = 5): boolean {
  if (!state || !state.includes('.')) {
    return false;
  }

  const parts = state.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const timestamp = parseInt(parts[1], 10);
  if (isNaN(timestamp)) {
    return false;
  }

  const now = Date.now();
  const expirationMs = validityInMinutes * 60 * 1000;

  // Check if timestamp is in the future (allow small drift) or expired
  if (timestamp > now + 5000) {
    return false;
  }

  if (now - timestamp > expirationMs) {
    return false;
  }

  return true;
}
