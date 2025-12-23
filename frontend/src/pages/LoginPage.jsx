import { Link } from "react-router-dom";
import { Scale, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";

const LoginPage = () => {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#0B1221] flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="https://images.unsplash.com/photo-1747696766706-5485b39bf358?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxkYXJrJTIwbWFyYmxlJTIwdGV4dHVyZSUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzY2NDg1MDE5fDA&ixlib=rb-4.1.0&q=85"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-3" data-testid="login-logo">
            <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center">
              <Scale className="w-5 h-5 text-[#C6A87C]" />
            </div>
            <span className="font-serif text-2xl font-semibold text-[#F9F7F1] tracking-tight">
              Sovereign Vault
            </span>
          </Link>
          
          <div className="max-w-md">
            <h2 className="font-serif text-4xl text-[#F9F7F1] mb-6 leading-tight">
              Protect Your Assets Through <span className="text-[#C6A87C]">Pure Equity</span>
            </h2>
            <p className="font-sans text-[#F9F7F1]/60 leading-relaxed mb-8">
              Access your secure vault to create, manage, and download professional trust documents 
              aligned with centuries of equitable jurisprudence.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-[#C6A87C] font-serif text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-serif text-[#F9F7F1] mb-1">Create Trust Documents</h4>
                  <p className="font-sans text-sm text-[#F9F7F1]/50">
                    Generate professional declarations, deeds, and affidavits
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-[#C6A87C] font-serif text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-serif text-[#F9F7F1] mb-1">Define Trust Roles</h4>
                  <p className="font-sans text-sm text-[#F9F7F1]/50">
                    Specify Grantor, Trustee, and Beneficiary details
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-[#C6A87C] font-serif text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-serif text-[#F9F7F1] mb-1">Download as PDF</h4>
                  <p className="font-sans text-sm text-[#F9F7F1]/50">
                    Export your documents for signing and filing
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#2D3748] pt-6">
            <p className="font-serif text-lg text-[#C6A87C] italic">
              "Equity will not aid a volunteer"
            </p>
            <p className="font-sans text-xs text-[#F9F7F1]/40 mt-2 uppercase tracking-wider">
              — Maxim of Equity
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-[#F9F7F1]/60 hover:text-[#C6A87C] transition-colors mb-12"
            data-testid="back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-sans text-sm">Back to Home</span>
          </Link>

          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center">
                <Scale className="w-5 h-5 text-[#C6A87C]" />
              </div>
              <span className="font-serif text-2xl font-semibold text-[#F9F7F1] tracking-tight">
                Sovereign Vault
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-3xl text-[#F9F7F1] mb-2">
                Access Your Vault
              </h1>
              <p className="font-sans text-[#F9F7F1]/60">
                Sign in securely to manage your trust documents
              </p>
            </div>

            <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-8">
              <Button 
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-gray-50 text-[#0B1221] font-sans font-medium py-6 rounded-sm transition-all duration-300 flex items-center justify-center gap-3"
                data-testid="google-login-btn"
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

              <div className="mt-6 pt-6 border-t border-[#2D3748]">
                <p className="font-sans text-xs text-[#F9F7F1]/40 text-center">
                  By signing in, you agree to securely store your trust documents in your personal vault.
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="font-sans text-sm text-[#F9F7F1]/40">
                New to Pure Equity Trusts?{" "}
                <Link to="/education" className="text-[#C6A87C] hover:underline" data-testid="learn-more-link">
                  Learn More
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
