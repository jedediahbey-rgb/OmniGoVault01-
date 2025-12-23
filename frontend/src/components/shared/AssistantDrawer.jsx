import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { marked } from 'marked';
import {
  Bot, X, Send, Sparkles, BookOpen, FileText, CheckSquare,
  List, Copy, RefreshCw, ChevronDown, Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const contextActions = [
  { id: 'explain', label: 'Explain this concept', icon: BookOpen },
  { id: 'maxims', label: 'Find related maxims', icon: Sparkles },
  { id: 'checklist', label: 'Generate checklist', icon: CheckSquare },
  { id: 'steps', label: 'Step-by-step guide', icon: List },
  { id: 'draft', label: 'Draft from template', icon: FileText },
];

export default function AssistantDrawer({ isOpen, onClose, context }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showActions, setShowActions] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText = input, isStructured = false) => {
    if (!messageText.trim() || loading) return;

    const userMessage = { id: Date.now(), role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowActions(false);
    setLoading(true);

    try {
      // Add instruction for structured output
      let prompt = messageText;
      if (isStructured) {
        prompt = `Please provide a structured response with clear sections, bullet points, or numbered steps. ${messageText}`;
      }
      if (context?.page) {
        prompt = `[Context: User is on ${context.page} page] ${prompt}`;
      }

      const response = await axios.post(`${API}/assistant/chat`, {
        message: prompt,
        session_id: sessionId
      });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.response,
        disclaimer: response.data.disclaimer
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (!sessionId) setSessionId(response.data.session_id);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I encountered an error. Please try again.',
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleContextAction = (action) => {
    const prompts = {
      explain: 'Explain this concept in simple terms with examples.',
      maxims: 'What maxims of equity relate to this topic? List them with brief explanations.',
      checklist: 'Generate a checklist of key considerations or steps for this topic.',
      steps: 'Provide a step-by-step guide for understanding or applying this concept.',
      draft: 'What template would be appropriate here? Describe the key sections.',
    };
    sendMessage(prompts[action.id], true);
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const resetChat = () => {
    setMessages([]);
    setSessionId(null);
    setShowActions(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-screen w-96 bg-vault-navy/95 backdrop-blur-xl border-l border-white/10 z-[60] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-vault-gold/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-vault-gold" />
              </div>
              <div>
                <h3 className="text-white font-medium">AI Assistant</h3>
                <p className="text-xs text-white/40">Educational guidance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={resetChat} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5">
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {messages.length === 0 && showActions && (
              <div className="space-y-4">
                <p className="text-white/50 text-sm">How can I help you today?</p>
                <div className="space-y-2">
                  {contextActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleContextAction(action)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:border-vault-gold/30 hover:bg-vault-gold/5 transition-all text-left"
                    >
                      <action.icon className="w-4 h-4 text-vault-gold" />
                      <span className="text-white/70 text-sm">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-vault-blue/20 text-white'
                    : msg.isError
                    ? 'bg-red-500/20 text-white/80'
                    : 'bg-white/5 text-white/80'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div>
                      <div 
                        className="prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: marked(msg.content) }}
                      />
                      {msg.disclaimer && (
                        <p className="text-[10px] text-vault-gold/60 mt-2 pt-2 border-t border-white/10">
                          {msg.disclaimer}
                        </p>
                      )}
                      <button
                        onClick={() => copyMessage(msg.content)}
                        className="mt-2 text-[10px] text-white/30 hover:text-white/50 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center text-white/40">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask a question..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 min-h-[60px] max-h-[100px] bg-white/5 border-white/10 resize-none text-sm"
                rows={2}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="btn-primary h-auto px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-white/30 mt-2 text-center">
              Educational guidance only • Not legal advice
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
