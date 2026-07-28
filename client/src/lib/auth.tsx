import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiRequest } from "./queryClient";
import type { Role } from "./api";

interface AuthState {
  role: Role | null;
  loading: boolean;
  login: (password: string, role?: Role) => Promise<Role>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const data = await res.json();
      setRole(data.role);
    } catch {
      setRole(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(password: string, roleHint?: Role): Promise<Role> {
    const res = await apiRequest("POST", "/api/auth/login", { password, role: roleHint });
    const data = await res.json();
    setRole(data.role);
    return data.role;
  }

  async function logout() {
    await apiRequest("POST", "/api/auth/logout");
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Permission helpers shared across the app.
export const MANAGER_ROLES: Role[] = ["production_manager", "plant_manager"];
export function isManager(role: Role | null): boolean {
  return role === "production_manager" || role === "plant_manager";
}
export function isPlantManager(role: Role | null): boolean {
  return role === "plant_manager";
}
