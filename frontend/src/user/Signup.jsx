import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
export const Signup = () => {
  const navigate = useNavigate()
  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-400 overflow-y-auto py-8">
      <div className="bg-gray-200 p-8 rounded-xl shadow-md w-full max-w-md">

        <div className="flex flex-col items-center gap-2 mb-6">
          <img src="/mortarboard.png" alt="Laze logo" className="w-16 h-16" />
          <p className="font-bold">Welcome to</p>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>

        

        <form  className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
           
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            placeholder="Password"
           
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            placeholder="Confirm Password"
          
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
          
            className="bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            Sign Up
          </button>
        </form>

        <div className="flex items-center my-4">
          <hr className="flex-1" />
          <span className="mx-3 text-gray-400 text-sm">or</span>
          <hr className="flex-1" />
        </div>

        <button
          
          className="w-full border py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 border-black border-1"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
