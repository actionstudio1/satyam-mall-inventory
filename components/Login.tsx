import React, { useState, useEffect } from 'react';
import { Box, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginUser } from '../services/sheetService';

interface LoginProps {
  onLogin: (user: { email: string; name: string; role: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedCredentials = localStorage.getItem('satyam_mall_saved_login');
    if (savedCredentials) {
      try {
        const { email: savedEmail, password: savedPass } = JSON.parse(savedCredentials);
        setEmail(savedEmail);
        setPassword(savedPass);
        setRememberMe(true);
      } catch {
        localStorage.removeItem('satyam_mall_saved_login');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await loginUser(email.trim(), password.trim());

    if (result.success && result.user) {
      if (rememberMe) {
        localStorage.setItem('satyam_mall_saved_login', JSON.stringify({ email: result.user.email, password: password.trim() }));
      } else {
        localStorage.removeItem('satyam_mall_saved_login');
      }

      localStorage.setItem('satyam_mall_user', JSON.stringify({
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        loginTime: new Date().toISOString()
      }));

      onLogin(result.user);
    } else {
      setError(result.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-xl mb-3">
            <Box className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Satyam Mall</h1>
          <p className="text-gray-500 text-sm">Inventory Management System</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome Back</h2>
          <p className="text-gray-500 text-sm mb-5">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  placeholder="Enter email"
                  className="input-field pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  className="input-field pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600 cursor-pointer select-none">
                Remember me
              </label>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2">
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Satyam Mall Inventory System
        </p>
      </div>
    </div>
  );
};

export default Login;
