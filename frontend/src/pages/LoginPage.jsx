import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Shield,
  Eye,
  EyeSlash,
  EnvelopeSimple,
  Lock,
  User,
  SpinnerGap
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { fadeInUp } from '../lib/motion';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (!isLogin && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password, name: formData.name };
      
      console.log(`[AUTH] ${isLogin ? 'Login' : 'Register'} attempt for:`, formData.email);
      
      const res = await axios.post(`${API}${endpoint}`, payload);
      
      console.log('[AUTH] Response:', res.data);
      
      if (res.data.user && res.data.session_token) {
        toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
        
        // Store user info in localStorage for the app to use
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        // Navigate to vault
        navigate('/vault');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('[AUTH] Error:', error);
      const message = error.response?.data?.detail || error.message || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-navy flex items-center justify-center p-8">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-vault-navy via-vault-navy to-vault-void" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-vault-gold/5 rounded-full blur-[150px]" />
      
      <motion.div 
        {...fadeInUp}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back button */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" weight="duotone" />
          <span>Back to home</span>
        </button>

        {/* Login card */}
        <div className="glass-panel rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-vault-gold to-vault-gold-dim flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-vault-navy" weight="duotone" />
            </div>
            <h1 className="text-2xl font-heading text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-white/50">
              {isLogin 
                ? 'Sign in to access your trust portfolios and documents'
                : 'Create an account to manage your trust portfolios'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (register only) */}
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" weight="duotone" />
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12"
                />
              </div>
            )}
            
            {/* Email field */}
            <div className="relative">
              <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" weight="duotone" />
              <Input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12"
                required
              />
            </div>
            
            {/* Password field */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" weight="duotone" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-11 pr-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showPassword ? (
                  <EyeSlash className="w-5 h-5" weight="duotone" />
                ) : (
                  <Eye className="w-5 h-5" weight="duotone" />
                )}
              </button>
            </div>
            
            <Button 
              type="submit"
              disabled={loading}
              className="w-full bg-vault-gold text-vault-navy hover:bg-vault-gold/90 py-6 text-base font-medium flex items-center justify-center gap-3 rounded-lg"
            >
              {loading ? (
                <>
                  <SpinnerGap className="w-5 h-5 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ email: '', password: '', name: '' });
              }}
              className="text-sm text-vault-gold hover:text-vault-gold/80 transition-colors"
            >
              {isLogin 
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'
              }
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-white/40 text-sm">
            {isLogin 
              ? 'Enter your credentials to access your vault'
              : 'Create an account to start managing your trust documents'
            }
          </p>
        </div>
      </motion.div>
    </div>
  );
}
