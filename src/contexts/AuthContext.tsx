"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loginAction,
  logoutAction,
  registerAction,
} from "@/actions/auth";

import type { User } from "@/types";

type AuthOperationResult = {
  error?: string;
  retryAfterSeconds?: number;
  requiresEmailConfirmation?: boolean;
  message?: string;

  fieldErrors?: Record<
    string,
    string[] | undefined
  >;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (
    email: string,
    password: string,
    redirectTo?: string,
  ) => Promise<AuthOperationResult>;

  register: (
    nome: string,
    sobrenome: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => Promise<AuthOperationResult>;

  logout: () => Promise<AuthOperationResult>;
}

const AuthContext =
  createContext<
    AuthContextType | undefined
  >(undefined);

type AuthProviderProps = {
  children: ReactNode;
  initialUser: User | null;
};

export function AuthProvider({
  children,
  initialUser,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<User | null>(
      initialUser,
    );

  /**
   * Agora representa apenas uma operação
   * de login, cadastro ou logout em andamento.
   *
   * O carregamento inicial já aconteceu
   * no servidor.
   */
  const [isLoading, setIsLoading] =
    useState(false);

  /**
   * Quando o servidor renderizar novamente
   * o layout, sincroniza o novo usuário.
   */
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      redirectTo?: string,
    ): Promise<AuthOperationResult> => {
      setIsLoading(true);

      try {
        const result =
          await loginAction({
            email,
            password,
            redirectTo,
          });

        /**
         * Em caso de sucesso, loginAction
         * redirecionará pelo servidor.
         *
         * Portanto, normalmente somente
         * erros chegam neste ponto.
         */
        if (!result.ok) {
          return {
            error: result.message,
            retryAfterSeconds:
              result.retryAfterSeconds,
          };
        }

        return {
          message: result.message,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const register = useCallback(
  async (
    nome: string,
    sobrenome: string,
    email: string,
    password: string,
    confirmPassword: string,
  ): Promise<AuthOperationResult> => {
    setIsLoading(true);

    try {
      const result =
        await registerAction({
          nome,
          sobrenome,
          email,
          password,
          confirmPassword,
        });

      if (!result.ok) {
        return {
          error: result.message,

          retryAfterSeconds:
            result.retryAfterSeconds,

          fieldErrors:
            result.fieldErrors,
        };
      }

      return {
        message: result.message,

        requiresEmailConfirmation:
          result.requiresEmailConfirmation,
      };
    } finally {
      setIsLoading(false);
    }
  },
  [],
);

  const logout = useCallback(
    async (): Promise<AuthOperationResult> => {
      setIsLoading(true);

      try {
        const result =
          await logoutAction();

        /**
         * Em caso de sucesso, a action
         * redireciona para /login.
         */
        if (!result.ok) {
          return {
            error: result.message,
          };
        }

        return {};
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,

        isAuthenticated:
          user !== null,

        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth deve ser usado dentro de um AuthProvider",
    );
  }

  return context;
}