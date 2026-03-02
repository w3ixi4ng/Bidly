import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#09090b' }}>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-black tracking-tight">
            <span className="text-white">bid</span>
            <span className="gradient-text">ly</span>
          </Link>
          <h1 className="mt-5 text-xl font-bold text-white">Welcome back</h1>
          <p className="text-zinc-500 text-sm mt-1.5">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800/60 p-6" style={{ background: 'rgba(18,18,20,0.9)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors border border-zinc-800 focus:border-indigo-500/60"
                style={{ background: 'rgba(24,24,27,0.8)' }}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors border border-zinc-800 focus:border-indigo-500/60"
                style={{ background: 'rgba(24,24,27,0.8)' }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/8">
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: loading ? 'none' : '0 0 20px rgba(99,102,241,0.3)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-zinc-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
