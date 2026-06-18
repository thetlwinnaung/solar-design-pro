/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type AuthChangeListener = (event: string, session: any) => void;
const listeners: Set<AuthChangeListener> = new Set();

const getStoredSession = () => {
  const raw = localStorage.getItem('solar_surveys_session');
  if (raw) {
    try {
      const session = JSON.parse(raw);
      if (session && session.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        // If expired (or within 10 seconds of expiry), clear session
        if (now >= session.expires_at - 10) {
          localStorage.removeItem('solar_surveys_session');
          return null;
        }
      }
      return session;
    } catch {
      localStorage.removeItem('solar_surveys_session');
      return null;
    }
  }
  return null;
};

const getAuthHeaders = () => {
  const session = getStoredSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
};

const notifyListeners = (event: string, session: any) => {
  listeners.forEach((callback) => {
    try {
      callback(event, session);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
};

export const supabase = {
  auth: {
    signUp: async (credentials: any) => {
      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        const result = await response.json();
        if (!response.ok || result.error) {
          throw new Error(result.error?.message || result.error || 'Failed to sign up');
        }
        if (result.session) {
          localStorage.setItem('solar_surveys_session', JSON.stringify(result.session));
          notifyListeners('SIGNED_IN', result.session);
        }
        return { data: { user: result.user, session: result.session }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err };
      }
    },

    signInWithPassword: async (credentials: any) => {
      try {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        const result = await response.json();
        if (!response.ok || result.error) {
          throw new Error(result.error?.message || result.error || 'Failed to sign in');
        }
        if (result.session) {
          localStorage.setItem('solar_surveys_session', JSON.stringify(result.session));
          notifyListeners('SIGNED_IN', result.session);
        }
        return { data: { user: result.user, session: result.session }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err };
      }
    },

    getSession: async () => {
      const session = getStoredSession();
      return { data: { session }, error: null };
    },

    onAuthStateChange: (callback: AuthChangeListener) => {
      listeners.add(callback);
      const session = getStoredSession();
      setTimeout(() => {
        try {
          callback('INITIAL_SESSION', session);
        } catch (e) {
          console.error(e);
        }
      }, 0);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(callback);
            },
          },
        },
      };
    },

    signOut: async () => {
      try {
        const response = await fetch('/api/auth/signout', {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        localStorage.removeItem('solar_surveys_session');
        notifyListeners('SIGNED_OUT', null);
        return { error: null };
      } catch (err: any) {
        localStorage.removeItem('solar_surveys_session');
        notifyListeners('SIGNED_OUT', null);
        return { error: err };
      }
    },
  },

  from: (table: string) => {
    return {
      select: (columns: string = '*') => {
        return {
          order: async (column: string, { ascending }: { ascending: boolean }) => {
            try {
              const response = await fetch(`/api/surveys?order=${column}&ascending=${ascending}`, {
                method: 'GET',
                headers: getAuthHeaders(),
              });
              const result = await response.json();
              if (!response.ok || result.error) {
                throw new Error(result.error?.message || result.error || 'Failed to fetch surveys');
              }
              return { data: result.data, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            }
          },
        };
      },

      upsert: async (values: any) => {
        try {
          const response = await fetch('/api/surveys/upsert', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(values),
          });
          const result = await response.json();
          if (!response.ok || result.error) {
            throw new Error(result.error?.message || result.error || 'Failed to upsert survey');
          }
          return { data: result.data, error: null };
        } catch (err: any) {
          return { error: err };
        }
      },

      delete: () => {
        return {
          eq: async (column: string, value: any) => {
            try {
              const response = await fetch(`/api/surveys/delete?column=${column}&value=${encodeURIComponent(value)}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
              });
              const result = await response.json();
              if (!response.ok || result.error) {
                throw new Error(result.error?.message || result.error || 'Failed to delete survey');
              }
              return { error: null };
            } catch (err: any) {
              return { error: err };
            }
          },
        };
      },
    };
  },
};
