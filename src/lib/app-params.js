const isNode = typeof window === 'undefined';
const storage = isNode
  ? {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  : window.localStorage;

const APP_STORAGE_PREFIX = 'bowerman_training_log';
const LEGACY_STORAGE_PREFIX = 'base44';

export const SESSION_STORAGE_KEY = `${APP_STORAGE_PREFIX}_access_token`;
export const LEGACY_SESSION_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}_access_token`;

const toSnakeCase = (value) => value.replace(/([A-Z])/g, '_$1').toLowerCase();
const getEnvValue = (...values) => values.find((value) => value);

const getStorageKeys = (paramName) => [
  `${APP_STORAGE_PREFIX}_${toSnakeCase(paramName)}`,
  `${LEGACY_STORAGE_PREFIX}_${toSnakeCase(paramName)}`,
];

const clearStoredValue = (paramName) => {
  getStorageKeys(paramName).forEach((key) => storage.removeItem(key));
};

const getStoredValue = (paramName) => {
  const storageKeys = getStorageKeys(paramName);

  for (const key of storageKeys) {
    const value = storage.getItem(key);
    if (value) {
      return value;
    }
  }

  return null;
};

const storeValue = (paramName, value) => {
  if (value === undefined || value === null || value === '') {
    return value ?? null;
  }

  storage.setItem(getStorageKeys(paramName)[0], value);
  return value;
};

const getAppParamValue = (paramName, { defaultValue, removeFromUrl = false } = {}) => {
  if (isNode) {
    return defaultValue ?? null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);

  if (removeFromUrl && searchParam) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }

  if (searchParam) {
    return storeValue(paramName, searchParam);
  }

  const storedValue = getStoredValue(paramName);
  if (storedValue) {
    return storedValue;
  }

  if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
    return storeValue(paramName, defaultValue);
  }

  return null;
};

export const clearStoredAppSession = () => {
  clearStoredValue('access_token');
  storage.removeItem('token');
};

const getAppParams = () => {
  if (getAppParamValue('clear_access_token') === 'true') {
    clearStoredAppSession();
  }

  return {
    appId: getAppParamValue('app_id', {
      defaultValue: getEnvValue(import.meta.env.VITE_APP_ID, import.meta.env.VITE_BASE44_APP_ID),
    }),
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', {
      defaultValue: isNode ? null : window.location.href,
    }),
    functionsVersion: getAppParamValue('functions_version', {
      defaultValue: getEnvValue(
        import.meta.env.VITE_FUNCTIONS_VERSION,
        import.meta.env.VITE_BASE44_FUNCTIONS_VERSION
      ),
    }),
    appBaseUrl: getAppParamValue('app_base_url', {
      defaultValue: getEnvValue(
        import.meta.env.VITE_APP_BASE_URL,
        import.meta.env.VITE_BASE44_APP_BASE_URL
      ),
    }),
    serverUrl: getAppParamValue('api_base_url', {
      defaultValue: getEnvValue(
        import.meta.env.VITE_API_BASE_URL,
        import.meta.env.VITE_BASE44_SERVER_URL,
        'https://base44.app'
      ),
    }),
  };
};

export const appParams = {
  ...getAppParams(),
};
