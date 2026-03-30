import { assertSupabaseConfigured } from '@/lib/supabase';

const ENTITY_TABLES = {
  User: 'profiles',
  TrainingWeek: 'training_weeks',
  DayPlan: 'day_plans',
  Shoe: 'shoes',
};

const createAppError = (message, options = {}) => {
  const error = new Error(message);
  error.status = options.status;
  error.code = options.code;
  error.data = options.data;
  return error;
};

const normalizeSupabaseError = (error, fallbackMessage = 'Request failed') => {
  if (!error) {
    return createAppError(fallbackMessage);
  }

  return createAppError(error.message || fallbackMessage, {
    status: error.status ? Number(error.status) : undefined,
    code: error.code,
    data: error,
  });
};

const getTableName = (entityName) => {
  const tableName = ENTITY_TABLES[entityName];
  if (!tableName) {
    throw createAppError(`Unknown entity "${entityName}"`, { status: 400 });
  }
  return tableName;
};

const getSelectClause = (fields) => {
  if (!fields) {
    return '*';
  }

  if (Array.isArray(fields)) {
    return fields.join(', ');
  }

  return fields;
};

const parseSort = (sort) => {
  if (!sort) {
    return null;
  }

  const descending = sort.startsWith('-');
  return {
    column: descending ? sort.slice(1) : sort,
    ascending: !descending,
  };
};

const applyFilters = (queryBuilder, filters = {}) => {
  return Object.entries(filters).reduce((builder, [column, value]) => {
    if (value === undefined) {
      return builder;
    }

    if (value === null) {
      return builder.is(column, null);
    }

    if (Array.isArray(value)) {
      return builder.in(column, value);
    }

    return builder.eq(column, value);
  }, queryBuilder);
};

const applyModifiers = (queryBuilder, sort, limit, skip) => {
  let builder = queryBuilder;
  const parsedSort = parseSort(sort);

  if (parsedSort?.column) {
    builder = builder.order(parsedSort.column, { ascending: parsedSort.ascending });
  }

  if (skip !== undefined && limit !== undefined) {
    builder = builder.range(skip, skip + limit - 1);
  } else if (limit !== undefined) {
    builder = builder.limit(limit);
  } else if (skip !== undefined) {
    builder = builder.range(skip, skip + 999);
  }

  return builder;
};

const sanitizeRecord = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeRecord);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .map(([nestedKey, nestedValue]) => [nestedKey, sanitizeRecord(nestedValue)])
    );
  }

  return value;
};

const ensureProfile = async (authUser) => {
  const supabase = assertSupabaseConfigured();
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingProfileError) {
    throw normalizeSupabaseError(existingProfileError, 'Failed to load user profile');
  }

  if (existingProfile) {
    return {
      ...existingProfile,
      email: existingProfile.email || authUser.email || '',
    };
  }

  const profileDefaults = {
    id: authUser.id,
    email: authUser.email,
    full_name:
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      '',
    role: 'athlete',
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(profileDefaults)
    .select('*')
    .single();

  if (error) {
    throw normalizeSupabaseError(error, 'Failed to load user profile');
  }

  return {
    ...data,
    email: data.email || authUser.email || '',
  };
};

const getCurrentProfile = async () => {
  const supabase = assertSupabaseConfigured();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    if (error.name === 'AuthSessionMissingError' || error.message === 'Auth session missing!') {
      throw createAppError('Authentication required', { status: 401 });
    }
    throw normalizeSupabaseError(error, 'Failed to load current user');
  }

  if (!session?.user) {
    throw createAppError('Authentication required', { status: 401 });
  }

  return ensureProfile(session.user);
};

const createEntityHandler = (entityName) => {
  const tableName = getTableName(entityName);

  return {
    async list(sort, limit, skip, fields) {
      const supabase = assertSupabaseConfigured();
      let query = supabase.from(tableName).select(getSelectClause(fields));
      query = applyModifiers(query, sort, limit, skip);
      const { data, error } = await query;

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return data ?? [];
    },
    async filter(filters, sort, limit, skip, fields) {
      const supabase = assertSupabaseConfigured();
      let query = supabase.from(tableName).select(getSelectClause(fields));
      query = applyFilters(query, filters);
      query = applyModifiers(query, sort, limit, skip);
      const { data, error } = await query;

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return data ?? [];
    },
    async get(id, fields) {
      const supabase = assertSupabaseConfigured();
      const { data, error } = await supabase
        .from(tableName)
        .select(getSelectClause(fields))
        .eq('id', id)
        .single();

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return data;
    },
    async create(payload) {
      const supabase = assertSupabaseConfigured();
      const { data, error } = await supabase
        .from(tableName)
        .insert(sanitizeRecord(payload))
        .select('*')
        .single();

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return data;
    },
    async bulkCreate(payload) {
      const supabase = assertSupabaseConfigured();
      const { data, error } = await supabase
        .from(tableName)
        .insert(payload.map(sanitizeRecord))
        .select('*');

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return data ?? [];
    },
    async update(id, payload) {
      const supabase = assertSupabaseConfigured();
      const { data, error } = await supabase
        .from(tableName)
        .update(sanitizeRecord(payload))
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return data;
    },
    async delete(id) {
      const supabase = assertSupabaseConfigured();
      const { error } = await supabase.from(tableName).delete().eq('id', id);

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return { id };
    },
    async deleteMany(filters) {
      const supabase = assertSupabaseConfigured();
      let query = supabase.from(tableName).delete();
      query = applyFilters(query, filters);
      const { error } = await query;

      if (error) {
        throw normalizeSupabaseError(error);
      }

      return { success: true };
    },
  };
};

export const appClient = {
  auth: {
    me() {
      return getCurrentProfile();
    },
    async signInWithMagicLink(email, redirectTo) {
      const supabase = assertSupabaseConfigured();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        throw normalizeSupabaseError(error, 'Failed to send magic link');
      }

      return { success: true };
    },
    async logout() {
      const supabase = assertSupabaseConfigured();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw normalizeSupabaseError(error, 'Failed to sign out');
      }
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
    async logUserInApp() {
      return null;
    },
  },
};
