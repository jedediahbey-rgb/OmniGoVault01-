import { AlertTriangle } from 'lucide-react';

export default function Disclaimer({ variant = 'banner', className = '' }) {
  if (variant === 'banner') {
    return (
      <div className={`bg-vault-gold/10 border-b border-vault-gold/20 px-4 py-2 text-center ${className}`}>
        <p className="text-vault-gold text-xs flex items-center justify-center gap-2">
          <AlertTriangle className="w-3 h-3" />
          <span><strong>Educational use only.</strong> This is not legal advice. Consult qualified counsel for legal matters.</span>
        </p>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-start gap-2 p-3 rounded-lg bg-vault-gold/5 border border-vault-gold/20 ${className}`}>
        <AlertTriangle className="w-4 h-4 text-vault-gold flex-shrink-0 mt-0.5" />
        <p className="text-xs text-white/60">
          <span className="text-vault-gold font-medium">Educational only.</span> This information is for learning purposes and does not constitute legal advice.
        </p>
      </div>
    );
  }

  if (variant === 'template') {
    return (
      <div className={`flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/10 ${className}`}>
        <AlertTriangle className="w-4 h-4 text-vault-gold flex-shrink-0 mt-0.5" />
        <p className="text-xs text-white/50">
          This template is for educational purposes only. Verify with qualified legal counsel before relying on any documents.
        </p>
      </div>
    );
  }

  return null;
}
