import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { marked } from 'marked';
import { 
  Bot, 
  Send, 
  User,
  Sparkles,
  BookOpen,
  FileText,
  AlertTriangle,
  Copy,
  RefreshCw
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { fadeInUp } from '../lib/motion';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const suggestedQuestions = [
  "What are the maxims of equity?",
  "Explain the trustee-beneficiary relationship",
  "What is a constructive trust?",
  "How does laches work in equity?",
  "What documents are needed for a pure trust?"
];

export default function AssistantPage({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/assistant/chat`, {
        message: messageText,
        session_id: sessionId
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.response,
        disclaimer: response.data.disclaimer
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (!sessionId && response.data.session_id) {
        setSessionId(response.data.session_id);
      }
    } catch (error) {
      console.error('Assistant error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const resetChat = () => {
    setMessages([]);
    setSessionId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-8">
      <PageHeader
        icon={Bot}
        title="AI Assistant"
        subtitle="Your guide to equity and trust law—grounded in source materials"
        actions={
          messages.length > 0 && (
            <Button onClick={resetChat} variant="outline" className="btn-secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          )
        }
      />

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <GlassCard className="flex-1 flex flex-col overflow-hidden p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {messages.length === 0 ? (
                <motion.div 
                  {...fadeInUp}
                  className="h-full flex flex-col items-center justify-center text-center"
                >
                  <div className="w-20 h-20 rounded-2xl bg-vault-gold/10 flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-vault-gold" />
                  </div>
                  <h3 className="text-2xl font-heading text-white mb-3">
                    Equity Trust Assistant
                  </h3>
                  <p className="text-white/50 max-w-md mb-8">
                    Ask questions about equity jurisprudence, trust law, maxims, 
                    or get help drafting documents. All answers are grounded in 
                    the source materials.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
                    {suggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(question)}
                        className="p-3 text-left rounded-lg border border-white/10 hover:border-vault-gold/30 hover:bg-vault-gold/5 transition-all group"
                      >
                        <span className="text-white/60 group-hover:text-white text-sm">
                          {question}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-vault-blue/20' 
                        : message.isError 
                        ? 'bg-red-500/20' 
                        : 'bg-vault-gold/20'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-5 h-5 text-vault-blue" />
                      ) : message.isError ? (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Bot className="w-5 h-5 text-vault-gold" />
                      )}
                    </div>
                    
                    <div className={`flex-1 max-w-[80%] ${
                      message.role === 'user' ? 'text-right' : ''
                    }`}>
                      <div className={`inline-block p-4 rounded-xl ${
                        message.role === 'user'
                          ? 'bg-vault-blue/20 text-white'
                          : 'bg-white/5 text-white/80'
                      }`}>
                        {message.role === 'assistant' ? (
                          <div 
                            className="prose prose-invert prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: marked(message.content) }}
                          />
                        ) : (
                          <p>{message.content}</p>
                        )}
                        
                        {message.disclaimer && (
                          <p className="text-xs text-vault-gold/60 mt-3 pt-3 border-t border-white/10">
                            {message.disclaimer}
                          </p>
                        )}
                      </div>
                      
                      {message.role === 'assistant' && !message.isError && (
                        <button
                          onClick={() => copyMessage(message.content)}
                          className="mt-2 text-xs text-white/30 hover:text-white/60 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-vault-gold/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-vault-gold" />
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <div className="w-2 h-2 bg-vault-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-vault-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-vault-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Ask about equity, trusts, maxims, or documents..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-h-[60px] max-h-[120px] bg-white/5 border-white/10 focus:border-vault-gold resize-none"
                  rows={2}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="btn-primary h-auto"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-xs text-white/30 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar - Knowledge Context */}
        <div className="w-80 hidden lg:block">
          <GlassCard className="h-full overflow-y-auto custom-scrollbar">
            <h3 className="font-heading text-white text-lg mb-4">Knowledge Sources</h3>
            
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-vault-gold/5 border border-vault-gold/20">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-vault-gold" />
                  <span className="text-white text-sm">Kingdom vs Empire</span>
                </div>
                <p className="text-white/40 text-xs">
                  Comprehensive guide to equity jurisprudence, maxims, and trust relationships.
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-white/60" />
                  <span className="text-white text-sm">Pure Trust Under Equity</span>
                </div>
                <p className="text-white/40 text-xs">
                  Template documents and forms for establishing pure equity trusts.
                </p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="text-white/60 text-sm mb-3">Topics I Can Help With</h4>
              <div className="flex flex-wrap gap-2">
                {['Maxims', 'Trusts', 'Trustees', 'Beneficiaries', 'Documents', 'Conveyance', 'Notice'].map(topic => (
                  <span key={topic} className="px-2 py-1 bg-white/5 text-white/50 text-xs rounded">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mt-6 p-3 rounded-lg bg-vault-gold/5 border border-vault-gold/20">
              <div className="flex items-center gap-2 text-vault-gold text-sm mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Disclaimer</span>
              </div>
              <p className="text-white/40 text-xs">
                This assistant provides educational information only and does not constitute legal advice. 
                Always consult a qualified attorney for legal matters.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
