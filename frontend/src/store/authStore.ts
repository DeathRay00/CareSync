import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "patient" | "doctor";
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: "patient" | "doctor") => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });

        try {
          const formData = new URLSearchParams();
          formData.append("username", email);
          formData.append("password", password);

          const tokenRes = await api.post("/api/auth/login", formData, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });

          const accessToken = tokenRes.data.access_token;
          localStorage.setItem("access_token", accessToken);

          const userRes = await api.get("/api/auth/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          set({
            user: userRes.data,
            token: accessToken,
            isLoading: false,
          });
        } catch (error) {
          localStorage.removeItem("access_token");
          set({ user: null, token: null, isLoading: false });
          throw error;
        }
      },

      register: async (name, email, password, role) => {
        set({ isLoading: true });

        try {
          await api.post("/api/auth/register", {
            name,
            email,
            password,
            role,
          });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        set({ user: null, token: null });
      },

      fetchMe: async () => {
        try {
          const token = localStorage.getItem("access_token");
          if (!token) {
            set({ user: null, token: null });
            return;
          }

          const res = await api.get("/api/auth/me");
          set({ user: res.data, token });
        } catch {
          localStorage.removeItem("access_token");
          set({ user: null, token: null });
        }
      },
    }),
    { name: "auth-storage", partialize: (state) => ({ token: state.token }) }
  )
);
