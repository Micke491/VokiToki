export const AUTH_TOKEN_KEY = 'token';

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string, persist: boolean = false) => {
  if (typeof window === 'undefined') return;
  if (persist) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const removeAuthToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

const TRUSTED_DEVICE_KEY = 'trusted_device_token';

export const getTrustedDeviceToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TRUSTED_DEVICE_KEY);
};

export const setTrustedDeviceToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TRUSTED_DEVICE_KEY, token);
};
