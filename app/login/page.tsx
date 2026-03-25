'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getUserProfile } from '@/lib/auth'


export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await signIn(email, password)
      if (!data.user) throw new Error('Login failed')

     const profile = await getUserProfile(data.user.id)
      if (!profile) throw new Error('Profile not found')

      if (profile.role === 'manager') router.push('/dashboard')
      else if (profile.role === 'cashier') router.push('/pos')
      else if (profile.role === 'production') router.push('/production')
      else router.push('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err.message)
      setError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5A623' }}>

      {/* ── TOP NAVBAR ── */}
      <div className="w-full flex items-center px-8 py-4" style={{ backgroundColor: '#7B1111' }}>
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-xl tracking-wide">IS FREDS</span>

          {/*
            LOGO PLACEHOLDER
            When you have the logo file, replace the div below with:
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          */}
          <img src="/FREDS_ICON1.png" alt="Logo" className="w-10 h-10 object-contain" />

          <span className="text-white font-black text-xl tracking-wide">IS GOOD</span>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex relative overflow-hidden">

        {/* Left Side - Mascot Watermark */}
        <div className="w-1/2 relative">
          {/*
            MASCOT PLACEHOLDER
            When you have the mascot file, replace the div below with:
            <img
              src="/mascot.png"
              alt="Mascot"
              className="absolute inset-0 w-full h-full object-cover object-left"
              style={{ opacity: 0.2 }}
            />
          */}
          <img
        src="/logo-big.png"
        alt="Mascot"
          className="absolute inset-0 w-full h-full object-cover object-left"
  style={{ opacity: 0.3 }}
/>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-1/2 flex flex-col justify-center px-16 py-12">

          {/* Big Login Title */}
          <h1
            className="font-black mb-12 leading-none"
            style={{ fontSize: '6rem', color: '#1a1a1a' }}
          >
            Login
          </h1>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 max-w-md">
            <p className="font-bold text-sm" style={{ color: '#1a1a1a' }}>
              Please login to continue
            </p>

            {/* Email / Username */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Username"
              className="w-full px-5 py-4 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-600"
              style={{ backgroundColor: '#fff' }}
            />

            {/* Password */}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="w-full px-5 py-4 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-600"
              style={{ backgroundColor: '#fff' }}
            />

            {/* Error */}
            {error && (
              <p className="text-red-800 text-sm font-semibold bg-red-100 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 font-bold text-white rounded-lg transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#7B1111' }}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <p className="font-black text-xs tracking-widest" style={{ color: '#7B1111' }}>
              USER ACCOUNTS ARE PROVIDED
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}