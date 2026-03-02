import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import * as usersApi from '../api/users'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const data = await usersApi.login(email, password)
        localStorage.setItem('bidly_token', data.access_token)
        set({ user: data.user, token: data.access_token, isAuthenticated: true })
      },

      signup: async (email, password, name) => {
        const data = await usersApi.signup(email, password, name)
        localStorage.setItem('bidly_token', data.access_token)
        set({ user: data.user, token: data.access_token, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('bidly_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'bidly-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)
