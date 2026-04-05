"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { loginUser, registerUser } from "@/lib/api/auth";
import { fetchWorkspaces, type Workspace } from "@/lib/api/workspaces";

interface User {
  userId: string;
  email: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentWorkspace: (id: string) => void;
  reloadWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwt(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

function getInitialAuthState(): AuthState {
  if (typeof window === "undefined") {
    return {
      token: null,
      refreshToken: null,
      user: null,
      workspaces: [],
      currentWorkspaceId: null,
      isLoading: false,
    };
  }

  const stored = localStorage.getItem("auth");
  if (!stored) {
    return {
      token: null,
      refreshToken: null,
      user: null,
      workspaces: [],
      currentWorkspaceId: null,
      isLoading: false,
    };
  }

  try {
    const parsed = JSON.parse(stored);
    const user = parseJwt(parsed.token);
    return {
      token: parsed.token,
      refreshToken: parsed.refreshToken,
      user,
      workspaces: [],
      currentWorkspaceId: parsed.currentWorkspaceId ?? null,
      isLoading: false,
    };
  } catch {
    localStorage.removeItem("auth");
    return {
      token: null,
      refreshToken: null,
      user: null,
      workspaces: [],
      currentWorkspaceId: null,
      isLoading: false,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialAuthState);

  useEffect(() => {
    if (state.token && state.workspaces.length === 0 && !state.isLoading) {
      fetchWorkspaces(state.token)
        .then((ws) => {
          setState((s) => ({
            ...s,
            workspaces: ws,
            currentWorkspaceId: s.currentWorkspaceId ?? ws[0]?.id ?? null,
          }));
        })
        .catch(() => {});
    }
  }, [state.token, state.workspaces.length, state.isLoading]);

  const persist = useCallback(
    (token: string, refreshToken: string, workspaceId?: string | null) => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          token,
          refreshToken,
          currentWorkspaceId: workspaceId ?? state.currentWorkspaceId,
        }),
      );
    },
    [state.currentWorkspaceId],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await loginUser(email, password);
      const user = parseJwt(tokens.accessToken);
      persist(tokens.accessToken, tokens.refreshToken);
      setState({
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
        workspaces: [],
        currentWorkspaceId: null,
        isLoading: false,
      });
    },
    [persist],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const tokens = await registerUser(name, email, password);
      const user = parseJwt(tokens.accessToken);
      persist(tokens.accessToken, tokens.refreshToken);
      setState({
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
        workspaces: [],
        currentWorkspaceId: null,
        isLoading: false,
      });
    },
    [persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("auth");
    setState({
      token: null,
      refreshToken: null,
      user: null,
      workspaces: [],
      currentWorkspaceId: null,
      isLoading: false,
    });
  }, []);

  const setCurrentWorkspace = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, currentWorkspaceId: id }));
      if (state.token && state.refreshToken) {
        persist(state.token, state.refreshToken, id);
      }
    },
    [state.token, state.refreshToken, persist],
  );

  const reloadWorkspaces = useCallback(async () => {
    if (!state.token) return;
    const ws = await fetchWorkspaces(state.token);
    setState((s) => ({
      ...s,
      workspaces: ws,
      currentWorkspaceId: s.currentWorkspaceId ?? ws[0]?.id ?? null,
    }));
  }, [state.token]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        setCurrentWorkspace,
        reloadWorkspaces,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
