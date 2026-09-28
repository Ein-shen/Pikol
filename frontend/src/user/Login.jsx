import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import courtBg from '../assets/court.jpg';

export const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: call your login API here
    console.log({ email, password })
    // navigate('/dashboard')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-y-auto py-8 px-4">

      {/* Blurred background image, locked to viewport */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat  scale-110"
        style={{ backgroundImage: `url(${courtBg})` }}
      />
      {/* Dark overlay for readability, locked to viewport */}
      <div className="fixed inset-0 bg-black/10" />

      {/* Centered login card */}
      <div className="relative z-10 bg-white/20  backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md">

        <div className="flex flex-col items-center gap-2 mb-4 sm:mb-6">
          <p className="font-bold text-sm text-white sm:text-base">Welcome to Pikol League</p>
        </div>

        <h1 className="text-xl sm:text-2xl text-white font-bold mb-4 sm:mb-6 text-center">Welcome Back!</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="autofill-fix border-1 bg-transparent border-white/50 text-white rounded-lg px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="autofill-fix border-1 bg-transparent border-white/50 rounded-lg text-white px-4 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            onClick={() => navigate(`/dashboard`)}
            className="bg-blue-500 border-1 border-white/50 hover:bg-blue-400 text-white py-2 rounded-lg text-sm sm:text-base hover:bg-blue-600"
          >
            Login
          </button>
        </form>

        <div className="flex items-center my-3 sm:my-4">
          <hr className="flex-1" />
          <span className="mx-3 text-gray-400 text-xs sm:text-sm">or</span>
          <hr className="flex-1" />
        </div>

        <button
          type="button"
          className="w-full border-1 border-white/50 bg-white/10 hover:bg-white/20 border-black py-2 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-gray-50"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 text-white h-4 sm:w-5 sm:h-5" alt="Google" />
          Continue with Google
        </button>

        <p className="text-center text-xs sm:text-sm text-white mt-4">
          Don't have an account? <Link to="/signup" className="text-blue-500 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}