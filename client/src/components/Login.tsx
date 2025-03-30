import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
// @ts-ignore
import backgroundImage from '../assets/bg.png';
// @ts-ignore
import logoImage from '../assets/quickcatch.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would validate credentials here
    // For this dummy version, just navigate to the main app
    navigate('/app');
  };

  // This style will override any container constraints from index.css
  const pageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    margin: 0,
    padding: 0,
    display: 'flex',
    overflow: 'hidden'
  };

  return (
    <div style={pageStyle} className="bg-lime-100">
      {/* Left side - Hero/Promo area with background image */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center p-12 relative">
        {/* Background image as a separate div positioned absolutely */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: '70%',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.7  // Adjust opacity as needed
          }}
        ></div>
        
        <div className="max-w-md z-10 relative">
          <h1 className="text-4xl font-bold mb-6 text-gray-900">
            Track your favorite players, get real-time updates, and analyze their performance —<br />all in one place.
          </h1>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white">
        <div className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center justify-center mb-10">
              <img
                src={logoImage}
                alt="QuickCatch Logo"
                className="h-10"
              />
            </div>
            <h2 className="text-3xl font-bold mb-1">Log in</h2>
            <p className="text-gray-600">Welcome to QuickCatch!</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="mb-4">
              <label htmlFor="email" className="block mb-2 font-medium">Email</label>
              <input
                type="email"
                id="email"
                placeholder="m@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block mb-2 font-medium">Password</label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-2 border border-gray-300 rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-gray-900 text-white rounded font-medium mb-6"
            >
              Log in
            </button>
            
            <div className="text-center">
              <p className="text-gray-700">
                Don't have an account? <a href="/signup" className="text-blue-600 hover:underline">Sign up</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;