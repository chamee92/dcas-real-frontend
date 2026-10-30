"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, getAuthToken, getStoredUser, clearAuth, setStoredUser, setAuthToken } from "@/lib/api-client";

interface UserContextType {
  user: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  permissions: Record<string, boolean>;
  hasPermission: (permissionKey: string) => boolean;
  login: (payload: any) => Promise<any>;
  register: (payload: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserPermissions = async (roleId: number) => {
    try {
      const res = await api.roles.listPermissions(roleId);
      if (res.success && res.data?.items) {
        const permMap: Record<string, boolean> = {};
        res.data.items.forEach((item: any) => {
          const key = item.permission.toLowerCase().replace(/\s+/g, "_");
          permMap[key] = Number(item.status) === 1;
        });
        setPermissions(permMap);
      }
    } catch (err) {
      console.error("Failed to load user permissions", err);
    }
  };

  const refreshPermissions = async () => {
    const roleId = user?.role_id;
    if (roleId) {
      await fetchUserPermissions(roleId);
    }
  };

  useEffect(() => {
    if (user?.role_id) {
      fetchUserPermissions(user.role_id);
    }
  }, [user?.role_id]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = getAuthToken();
        const storedUser = getStoredUser();

        if (token && storedUser) {
          setUser(storedUser);
          // Let's verify and get fresh profile data in background
          const userId = storedUser.user_id || storedUser.id;
          if (userId) {
            try {
              const res = await api.auth.getUserData(userId);
              if (res.success && res.data) {
                setUser((prev: any) => ({ ...prev, ...res.data }));
              }
            } catch (e) {
              console.error("Failed to check active profile", e);
            }
          }
        } else {
          // If no credentials and trying to access dashboard, redirect to login
          if (pathname !== "/login") {
            router.push("/login");
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        clearAuth();
        setUser(null);
        if (pathname !== "/login") {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [pathname, router]);

  // Handle live login redirecting to dashboard on success
  const login = async (payload: any) => {
    setLoading(true);
    try {
      const response = await api.auth.login(payload);
      if (response.success && response.data) {
        setUser(response.data);
        if (response.data.role_id) {
          await fetchUserPermissions(response.data.role_id);
        }
        router.push("/dashboard");
      }
      return response;
    } finally {
      setLoading(false);
    }
  };

  // Handle register redirecting to dashboard on success
  const register = async (payload: any) => {
    setLoading(true);
    try {
      const response = await api.auth.register(payload);
      if (response.success && response.data) {
        setUser(response.data);
        if (response.data.role_id) {
          await fetchUserPermissions(response.data.role_id);
        }
        router.push("/dashboard");
      }
      return response;
    } finally {
      setLoading(false);
    }
  };

  // Handle user logout
  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setPermissions({});
      clearAuth();
      router.push("/login");
      setLoading(false);
    }
  };

  // Refresh user profile details
  const refreshUser = async () => {
    const userId = user?.user_id || user?.id;
    if (userId) {
      const res = await api.auth.getUserData(userId);
      if (res.success && res.data) {
        setUser((prev: any) => ({ ...prev, ...res.data }));
        if (res.data.role_id) {
          await fetchUserPermissions(res.data.role_id);
        }
      }
    }
  };

  const hasPermission = (permissionKey: string): boolean => {
    if (!permissionKey) return true;
    let key = permissionKey.toLowerCase().replace(/\s+/g, "_");
    
    // Convenient aliases mapping to exact backend permission keys
    const aliasMap: Record<string, string> = {
      "invoice_add": "customer_invoice_add",
      "invoice_manage": "customer_invoice_manage",
      "invoice_edit": "customer_invoice_manage",
      "invoice_view": "customer_invoice_view",
      "invoice_delete": "customer_invoice_delete",

      "quotation_add": "customer_quotation_add",
      "quotation_manage": "customer_quotation_manage",
      "quotation_edit": "customer_quotation_manage",
      "quotation_view": "customer_quotation_view",
      "quotation_delete": "customer_quotation_delete",

      "document_add": "customer_document_add",
      "document_manage": "customer_document_manage",
      "document_edit": "customer_document_manage",
      "document_view": "customer_document_view",
      "document_delete": "customer_document_delete",

      "tourist_add": "customer_add",
      "tourist_edit": "customer_edit",
      "tourist_view": "customer_view",
      "tourist_delete": "customer_delete",
      "tourist_status_change": "customer_status_change"
    };

    if (aliasMap[key]) {
      key = aliasMap[key];
    }

    // If explicitly defined in user permissions dictionary, use that boolean
    if (permissions[key] !== undefined) {
      return permissions[key];
    }
    
    // Fallback: allow if admin or before permissions load
    if (!user || user.role_id === 1 || user.role?.toLowerCase() === "admin") {
      return true;
    }
    
    return true;
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        permissions,
        hasPermission,
        login,
        register,
        logout,
        refreshUser,
        refreshPermissions,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
