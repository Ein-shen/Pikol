import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import courtBg from '../assets/court.jpg'
import api from '../api'
import { useAuth } from '../context/AuthContext'


export const Signup = () => {
  const {setUser} = useAuth
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')

  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Check before sending anything to the server
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const res = await api.post('/auth/signup', { username, email, password })
      setUser(res.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-y-auto py-8 px-4">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat scale-110"
        style={{ backgroundImage: `url(${courtBg})` }}
      />
      <div className="fixed inset-0 bg-black/10" />

      <div className="relative z-10 bg-white/20 backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex flex-col text-white items-center gap-2 mb-4 sm:mb-6">
          <p className="font-bold text-white text-sm sm:text-base">Welcome to Pikol League</p>
        </div>

        <h1 className="text-xl text-white sm:text-2xl font-bold mb-4 sm:mb-6 text-center">
          Create Account
        </h1>

        

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="autofill-fix border bg-transparent border-white/50 rounded-lg px-4 py-2 text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="autofill-fix border bg-transparent border-white/50 rounded-lg px-4 py-2 text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="autofill-fix border bg-transparent border-white/50 rounded-lg px-4 py-2 text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="autofill-fix border bg-transparent border-white/50 rounded-lg px-4 py-2 text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {error && (
            <p className="text-red-300 text-sm text-center" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white border border-white/50 py-2 rounded-lg text-sm sm:text-base hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="flex items-center my-3 sm:my-4">
          <hr className="flex-1 border-white/30" />
          <span className="mx-3 text-gray-300 text-xs sm:text-sm">or</span>
          <hr className="flex-1 border-white/30" />
        </div>

        <button
          type="button"
          className="w-full text-white border border-white/50 bg-white/10 hover:bg-white/20 py-2 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4 sm:w-5 sm:h-5" alt="Google" />
          Continue with Google
        </button>

        <p className="text-center text-xs sm:text-sm text-white mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-300 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}