import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { fadeInUp } from '../lib/motion';

export default function LoginPage() {
  const navigate = useNavigate();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/vault';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
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
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </button>

        {/* Login card */}
        <div className="glass-panel rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-vault-gold to-vault-gold-dim flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-vault-navy" />
            </div>
            <h1 className="text-2xl font-heading text-white mb-2">Welcome Back</h1>
            <p className="text-white/50">
              Sign in to access your trust portfolios and documents
            </p>
          </div>

          <Button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-vault-navy hover:bg-white/90 py-6 text-base font-medium flex items-center justify-center gap-3 rounded-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="mt-6 text-center">
            <p className="text-xs text-white/30">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-white/40 text-sm">
            Don't have an account? Signing in with Google will create one automatically.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
