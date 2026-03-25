import { createContext, useCallback, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getMe, googleLoginUser, loginUser, logoutUser, registerUser } from "../api/auth.api";
import useAuthStore from "../store/authStore";

export const AuthContext = createContext(undefined);

const queryClient = new QueryClient();

const ACCESS_TOKEN_KEY = "splitora_token";

const extractUser = (response) => response?.data?.user ?? response?.user ?? null;
const extractTokens = (response) => ({
  accessToken: response?.data?.accessToken ?? null,
  refreshToken: response?.data?.refreshToken ?? null,
});

export function AuthProvider({ children }) {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    setAuth,
    clearAuth,
    setUser,
    setLoading,
  } = useAuthStore();

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getMe();
        const me = extractUser(response);

        if (!me) {
          throw new Error("Unable to load current user");
        }

        setUser(me);
      } catch (error) {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, [clearAuth, setLoading, setUser]);

  const login = useCallback(
    async (data) => {
      const response = await loginUser(data);
      const nextUser = extractUser(response);
      const { accessToken: nextAccessToken, refreshToken: nextRefreshToken } = extractTokens(response);

      setAuth(nextUser, nextAccessToken, nextRefreshToken);
      toast.success("Logged in successfully");

      return nextUser;
    },
    [setAuth]
  );

  const loginWithGoogle = useCallback(
    async (idToken) => {
      const response = await googleLoginUser({ idToken });
      const nextUser = extractUser(response);
      const { accessToken: nextAccessToken, refreshToken: nextRefreshToken } = extractTokens(response);

      setAuth(nextUser, nextAccessToken, nextRefreshToken);
      toast.success("Logged in with Google");

      return nextUser;
    },
    [setAuth]
  );

  const register = useCallback(
    async (data) => {
      const response = await registerUser(data);
      const nextUser = extractUser(response);
      const { accessToken: nextAccessToken, refreshToken: nextRefreshToken } = extractTokens(response);

      setAuth(nextUser, nextAccessToken, nextRefreshToken);
      toast.success("Registered successfully");
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    } catch (_error) {
      // We still clear local auth state even if server logout fails.
    } finally {
      clearAuth();
      toast.success("Logged out");
      window.location.href = "/login";
    }
  }, [clearAuth, refreshToken]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      loginWithGoogle,
      register,
      logout,
      accessToken,
      refreshToken,
    }),
    [accessToken, isAuthenticated, isLoading, login, loginWithGoogle, logout, refreshToken, register, user]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default AuthProvider;
