import { appParams, clearStoredAppSession } from '@/lib/app-params';

const DEFAULT_SERVER_URL = 'https://base44.app';
const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const normalizeUrl = (value) => (value || '').replace(/\/+$/, '');

const serverUrl = normalizeUrl(appParams.serverUrl || DEFAULT_SERVER_URL);
const appBaseUrl = normalizeUrl(appParams.appBaseUrl || serverUrl);

const createAppError = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  const message =
    (typeof data === 'object' && data?.message) ||
    (typeof data === 'object' && data?.detail) ||
    response.statusText ||
    'Request failed';

  const error = new Error(message);
  error.status = response.status;
  error.data = data;

  return error;
};

const buildRequestUrl = (path, query) => {
  const url = new URL(`${serverUrl}/api${path}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const createHeaders = (headers = {}) => {
  const resolvedHeaders = {
    ...JSON_HEADERS,
    ...headers,
  };

  if (appParams.appId) {
    resolvedHeaders['X-App-Id'] = String(appParams.appId);
  }

  if (appParams.functionsVersion) {
    resolvedHeaders['Base44-Functions-Version'] = appParams.functionsVersion;
  }

  if (appParams.token) {
    resolvedHeaders.Authorization = `Bearer ${appParams.token}`;
  }

  if (typeof window !== 'undefined') {
    resolvedHeaders['X-Origin-URL'] = window.location.href;
  }

  return resolvedHeaders;
};

const request = async (path, { method = 'GET', query, data, headers } = {}) => {
  const response = await fetch(buildRequestUrl(path, query), {
    method,
    headers: createHeaders(headers),
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  if (!response.ok) {
    throw await createAppError(response);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const createEntityHandler = (entityName) => {
  const basePath = `/apps/${appParams.appId}/entities/${entityName}`;

  return {
    list(sort, limit, skip, fields) {
      return request(basePath, {
        query: {
          sort,
          limit,
          skip,
          fields: Array.isArray(fields) ? fields.join(',') : fields,
        },
      });
    },
    filter(query, sort, limit, skip, fields) {
      return request(basePath, {
        query: {
          q: JSON.stringify(query),
          sort,
          limit,
          skip,
          fields: Array.isArray(fields) ? fields.join(',') : fields,
        },
      });
    },
    get(id) {
      return request(`${basePath}/${id}`);
    },
    create(data) {
      return request(basePath, { method: 'POST', data });
    },
    bulkCreate(data) {
      return request(`${basePath}/bulk`, { method: 'POST', data });
    },
    update(id, data) {
      return request(`${basePath}/${id}`, { method: 'PUT', data });
    },
    delete(id) {
      return request(`${basePath}/${id}`, { method: 'DELETE' });
    },
    deleteMany(query) {
      return request(basePath, { method: 'DELETE', data: query });
    },
  };
};

const getRedirectUrl = (pathname, nextUrl) => {
  if (typeof window === 'undefined') {
    throw new Error('Browser APIs are required for authentication redirects.');
  }

  const redirectUrl = nextUrl
    ? new URL(nextUrl, window.location.origin).toString()
    : window.location.href;

  return `${appBaseUrl}${pathname}?from_url=${encodeURIComponent(redirectUrl)}`;
};

export const fetchPublicAppSettings = () =>
  request(`/apps/public/prod/public-settings/by-id/${appParams.appId}`);

export const appClient = {
  auth: {
    me() {
      return request(`/apps/${appParams.appId}/entities/User/me`);
    },
    redirectToLogin(nextUrl) {
      window.location.href = getRedirectUrl('/login', nextUrl);
    },
    logout(nextUrl = window.location.href) {
      clearStoredAppSession();
      window.location.href = `${appBaseUrl}/api/apps/auth/logout?from_url=${encodeURIComponent(nextUrl)}`;
    },
  },
  entities: new Proxy(
    {},
    {
      get(_target, entityName) {
        if (typeof entityName !== 'string' || entityName === 'then' || entityName.startsWith('_')) {
          return undefined;
        }

        return createEntityHandler(entityName);
      },
    }
  ),
  appLogs: {
    logUserInApp(pageName) {
      return request(`/app-logs/${appParams.appId}/log-user-in-app/${encodeURIComponent(pageName)}`, {
        method: 'POST',
      });
    },
  },
};
