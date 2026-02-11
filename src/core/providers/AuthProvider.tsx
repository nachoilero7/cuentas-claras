import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/src/core/config/supabase';

// ─── Tipos del contexto ─────────────────────────────────────────────────────

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Escuchar cambios en el estado de autenticacion de Supabase
  useEffect(() => {
    // Obtener la sesion actual al montar
    const getInitialSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error('[Auth] Error al obtener sesion inicial:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Suscribirse a cambios de autenticacion
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: AuthError | null }> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { error };
      } catch (error) {
        console.error('[Auth] Error inesperado en signIn:', error);
        return { error: error as AuthError };
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string
    ): Promise<{ error: AuthError | null }> => {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        return { error };
      } catch (error) {
        console.error('[Auth] Error inesperado en signUp:', error);
        return { error: error as AuthError };
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('[Auth] Error inesperado en signOut:', error);
      return { error: error as AuthError };
    }
  }, []);

  const isAuthenticated = !!session?.user;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      isAuthenticated,
      signIn,
      signUp,
      signOut,
    }),
    [session, user, isLoading, isAuthenticated, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      'useAuth debe ser usado dentro de un <AuthProvider>. ' +
        'Asegurate de envolver tu aplicacion con AuthProvider.'
    );
  }
  return context;
}
