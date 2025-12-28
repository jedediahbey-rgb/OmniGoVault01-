import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Vault, Plus, ArrowRight, Sparkle, Shield, Users, FileText } from '@phosphor-icons/react';

/**
 * Welcome Modal - First-Run Experience
 * 
 * Shown to new users after their first Google sign-in.
 * Primary CTA: "Create your first Vault"
 * Secondary: "Skip for now" to explore the app
 */
const WelcomeModal = ({ isOpen, onClose, onCreateVault, userName }) => {
  const navigate = useNavigate();
  
  const handleCreateVault = () => {
    onClose();
    // Navigate to vault creation (or trigger creation modal)
    navigate('/vault/workspaces?create=true');
  };
  
  const handleSkip = () => {
    onClose();
    // Just close and let them explore
  };

  const features = [
    {
      icon: Shield,
      title: "Secure Governance",
      description: "Manage trusts, estates, and private equity with built-in compliance"
    },
    {
      icon: Users,
      title: "Collaborate Safely",
      description: "Invite trustees, beneficiaries, and advisors with role-based access"
    },
    {
      icon: FileText,
      title: "Document Workflows",
      description: "Draft, review, sign, and lock documents with full audit trails"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={handleSkip}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="bg-vault-dark border border-vault-gold/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
              {/* Header with decorative gradient */}
              <div className="relative bg-gradient-to-br from-vault-gold/20 via-vault-gold/10 to-transparent p-6 sm:p-8">
                {/* Sparkle decorations */}
                <div className="absolute top-4 right-4">
                  <Sparkle className="w-6 h-6 text-vault-gold/40 animate-pulse" weight="fill" />
                </div>
                <div className="absolute bottom-4 left-8">
                  <Sparkle className="w-4 h-4 text-vault-gold/30 animate-pulse" style={{ animationDelay: '0.5s' }} weight="fill" />
                </div>
                
                {/* Vault icon */}
                <div className="w-16 h-16 rounded-2xl bg-vault-gold/20 border border-vault-gold/30 flex items-center justify-center mb-4">
                  <Vault className="w-8 h-8 text-vault-gold" weight="duotone" />
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">
                  Welcome to the Vault
                </h2>
                {userName && (
                  <p className="text-vault-gold mt-1">
                    {userName.split(' ')[0]}, your secure workspace awaits
                  </p>
                )}
              </div>
              
              {/* Content */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Features list */}
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-vault-gold/10 border border-vault-gold/20 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-vault-gold" weight="duotone" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{feature.title}</h3>
                        <p className="text-sm text-vault-muted">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Free tier info */}
                <div className="bg-vault-navy/50 border border-vault-gold/10 rounded-lg p-4">
                  <p className="text-sm text-vault-muted">
                    <span className="text-vault-gold font-medium">Free Plan:</span>{' '}
                    1 vault, 10 documents, 100MB storage. 
                    <span className="text-vault-light"> Upgrade anytime for more.</span>
                  </p>
                </div>
                
                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleCreateVault}
                    className="flex-1 bg-vault-gold hover:bg-vault-gold/90 text-vault-navy font-semibold h-12"
                  >
                    <Plus className="w-5 h-5 mr-2" weight="bold" />
                    Create Your First Vault
                  </Button>
                  <Button
                    onClick={handleSkip}
                    variant="ghost"
                    className="text-vault-muted hover:text-white hover:bg-vault-navy/50"
                  >
                    Skip for now
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal;
