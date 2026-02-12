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
import { signInWithGoogle as googleSignIn } from '@/src/core/services/googleAuth';

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
  ) => Promise<{ error: AuthError | null; needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
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
    const getInitialSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        if (__DEV__) console.error('[Auth] Error al obtener sesion inicial:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

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
        if (__DEV__) console.error('[Auth] Error inesperado en signIn:', error);
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
    ): Promise<{ error: AuthError | null; needsConfirmation: boolean }> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        // Si Supabase retorna un usuario sin sesion, requiere confirmacion de email
        const needsConfirmation = !error && !!data.user && !data.session;
        return { error, needsConfirmation };
      } catch (error) {
        if (__DEV__) console.error('[Auth] Error inesperado en signUp:', error);
        return { error: error as AuthError, needsConfirmation: false };
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await googleSignIn();
      return { error };
    } catch (error) {
      if (__DEV__) console.error('[Auth] Error inesperado en signInWithGoogle:', error);
      return { error: error instanceof Error ? error : new Error('Error inesperado') };
    }
  }, []);

  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      if (__DEV__) console.error('[Auth] Error inesperado en signOut:', error);
      return { error: error as AuthError };
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error: AuthError | null }> => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return { error };
      } catch (error) {
        if (__DEV__) console.error('[Auth] Error inesperado en resetPassword:', error);
        return { error: error as AuthError };
      }
    },
    []
  );

  const isAuthenticated = !!session?.user;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      isAuthenticated,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
    }),
    [session, user, isLoading, isAuthenticated, signIn, signUp, signInWithGoogle, signOut, resetPassword]
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
