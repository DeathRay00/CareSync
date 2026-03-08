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
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        const form = new URLSearchParams();
        form.append("username", email);
        form.append("password", password);

        const res = await api.post("/api/auth/login", form, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        const { access_token } = res.data;
        localStorage.setItem("access_token", access_token);
        set({ token: access_token, isLoading: false });
        await get().fetchMe();
      },

      register: async (name, email, password, role) => {
        set({ isLoading: true });
        await api.post("/api/auth/register", { name, email, password, role });
        set({ isLoading: false });
      },

      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null });
      },

      fetchMe: async () => {
        try {
          const res = await api.get("/api/auth/me");
          set({ user: res.data });
        } catch {
          set({ user: null, token: null });
        }
      },
    }),
    { name: "auth-storage", partialize: (state) => ({ token: state.token }) }
  )
);
