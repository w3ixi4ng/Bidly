import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Signup() {
  const navigate = useNavigate()
  const signup = useAuthStore((s) => s.signup)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setLoading(true)
    try {
      await signup(email, password, name || undefined)
      navigate('/')
    } catch {
      setError('Could not create account. This email may already be in use.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#09090b' }}>
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.09) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-black tracking-tight">
            <span className="text-white">bid</span>
            <span className="gradient-text">ly</span>
          </Link>
          <h1 className="mt-5 text-xl font-bold text-white">Create your account</h1>
          <p className="text-zinc-500 text-sm mt-1.5">Post tasks and bid on work — for free</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/60 p-6" style={{ background: 'rgba(18,18,20,0.9)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Name <span className="text-zinc-600">(optional)</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors border border-zinc-800 focus:border-amber-500/50"
                style={{ background: 'rgba(24,24,27,0.8)' }}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors border border-zinc-800 focus:border-amber-500/50"
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
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors border border-zinc-800 focus:border-amber-500/50"
                style={{ background: 'rgba(24,24,27,0.8)' }}
                placeholder="Min. 6 characters"
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
              className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: loading ? 'none' : '0 0 24px rgba(245,158,11,0.4)', color: '#09090b' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
