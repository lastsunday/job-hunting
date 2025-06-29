import * as React from 'react'
import { login as apiLogin } from "@/api";

export interface AuthContext {
  isAuthenticated: boolean
  login: (account: string, password: string) => Promise<void>
  logout: () => Promise<void>
  token: Token | null
}

const AuthContext = React.createContext<AuthContext | null>(null)

const KEY_TOKEN = 'auth.token'

export class Token {
  access_token: string = "";
  expires_in: number = 0;
  refresh_token: string = "";
  refresh_token_expires_in: number = 0;
  scope: string = "";
  token_type: string = "";
}

function getStoredToken(): Token | null {
  const tokenString = localStorage.getItem(KEY_TOKEN);
  return tokenString ? JSON.parse(tokenString) as Token : null;
}

export function getAccessToken(): string | null {
  const storedToken = getStoredToken()
  if (storedToken) {
    const { access_token } = storedToken;
    return access_token;
  } else {
    return null;
  }
}

export function getRefreshToken(): string | null {
  const storedToken = getStoredToken()
  if (storedToken) {
    const { refresh_token } = storedToken;
    return refresh_token;
  } else {
    return null;
  }
}

export function setStoredToken(token: Token | null) {
  if (token) {
    localStorage.setItem(KEY_TOKEN, JSON.stringify(token))
  } else {
    localStorage.removeItem(KEY_TOKEN)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<Token | null>(getStoredToken())
  const isAuthenticated = !!token

  const logout = React.useCallback(async () => {
    setStoredToken(null)
    setToken(null)
  }, [])

  const login = React.useCallback(async (account: string, password: string) => {
    const data = await apiLogin({ account, password });
    setStoredToken(data)
    setToken(data)
  }, [])

  React.useEffect(() => {
    setToken(getStoredToken())
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
