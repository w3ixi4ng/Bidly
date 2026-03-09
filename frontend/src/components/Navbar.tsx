import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/') }

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm transition-colors ${
        location.pathname === to ? 'text-white font-medium' : 'text-zinc-400 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )

  const initials = user ? (user.name ?? user.email).slice(0, 1).toUpperCase() : ''

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between" style={{ height: '60px' }}>

        <Link to="/" className="flex items-center select-none">
          <span className="text-lg font-black tracking-tight">
            <span className="text-white">bid</span>
            <span className="gradient-text">ly</span>
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-7">
          {navLink('/', 'Browse')}
          {isAuthenticated && navLink('/tasks/create', 'Post Task')}
          {isAuthenticated && navLink('/chats', 'Chats')}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to={`/profile/${user?.user_id}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-amber-300"
                  style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(251,191,36,0.2))' }}
                >
                  {initials}
                </div>
                <span className="text-sm text-zinc-300 hidden sm:block">
                  {user?.name ?? user?.email?.split('@')[0]}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs px-3.5 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Log in
              </Link>
              <Link
                to="/signup"
                className="text-sm px-4 py-2 rounded-lg font-semibold transition-all"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.35)', color: '#09090b' }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
