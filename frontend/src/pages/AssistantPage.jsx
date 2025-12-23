import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scale, Send, User, Bot, FileText, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Public API calls (no credentials needed for chat)
const publicApi = axios.create({
  baseURL: API,
  withCredentials: false
});

const AssistantPage = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: `Welcome to the Equity Trust Assistant! I can help you understand pure equity trusts, maxims of equity, and trust relationships.

**I am grounded in two source documents:**
- Kingdom vs Empire (Roark) - equity jurisprudence, maxims, relationships
- Pure Trust Under Equity - trust document templates and forms

Every answer I provide will include citations to these sources. If information is not found in the sources, I will tell you.

**Ask me about:**
• Maxims of Equity
• Trust relationships (Trustee-Beneficiary, Agent-Principal)
• Trust document structure
• Grantor, Trustee, and Beneficiary roles

*This is for educational purposes only and does not constitute legal advice.*

How can I help you today?`
    }]);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await publicApi.post(`/assistant/chat`, {
        message: userMessage,
        session_id: sessionId
      });

      setSessionId(response.data.session_id);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.data.response,
        disclaimer: response.data.disclaimer
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "What are the maxims of equity?",
    "Explain the trustee-beneficiary relationship",
    "What is required for a Declaration of Trust?",
    "What does 'equity looks to the intent' mean?"
  ];

  return (
    <div className="min-h-screen bg-[#0B1221] flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B1221]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center">
                <Scale className="w-5 h-5 text-[#C6A87C]" />
              </div>
              <span className="font-serif text-2xl font-semibold text-[#F8FAFC] tracking-tight">
                Equity Trust Portfolio
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/knowledge" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors">Knowledge</Link>
              <Link to="/maxims" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors">Maxims</Link>
              <Link to="/templates" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors">Templates</Link>
              <Link to="/assistant" className="font-sans text-sm text-[#C6A87C] transition-colors">Assistant</Link>
              <Link to="/vault">
                <Button className="bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5] font-sans font-bold uppercase tracking-wider text-xs px-6 py-2 rounded-sm">
                  Vault
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Chat Container */}
      <div className="flex-1 pt-24 pb-32 px-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C6A87C]/10 border border-[#C6A87C]/20 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-[#C6A87C]" />
              <span className="font-sans text-xs text-[#C6A87C] uppercase tracking-wider">AI Assistant</span>
            </div>
            <h1 className="font-serif text-3xl text-[#F8FAFC] mb-2" data-testid="assistant-title">
              Equity Trust <span className="text-[#C6A87C]">Assistant</span>
            </h1>
            <p className="font-sans text-slate-400 text-sm">
              Grounded in source documents · Every answer includes citations
            </p>
          </div>

          {/* Messages */}
          <div className="space-y-6" data-testid="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-[#C6A87C]" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-sm p-4 ${
                    message.role === "user"
                      ? "bg-[#C6A87C] text-[#0B1221]"
                      : message.error
                      ? "bg-red-500/10 border border-red-500/20 text-slate-300"
                      : "bg-[#111827] border border-white/5 text-slate-300"
                  }`}
                >
                  <div className="font-sans text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                  {message.disclaimer && (
                    <div className="flex items-start gap-2 mt-4 pt-4 border-t border-white/10">
                      <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5" />
                      <span className="font-sans text-xs text-slate-500">{message.disclaimer}</span>
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-[#C6A87C]" />
                </div>
                <div className="bg-[#111827] border border-white/5 rounded-sm p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#C6A87C] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#C6A87C] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-[#C6A87C] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length <= 1 && (
            <div className="mt-8">
              <p className="font-sans text-xs text-slate-500 uppercase tracking-wider mb-3">Suggested Questions</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(question)}
                    className="px-4 py-2 bg-[#111827] border border-white/5 rounded-full text-slate-400 text-sm hover:border-[#C6A87C]/30 hover:text-[#C6A87C] transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0B1221]/95 backdrop-blur-md border-t border-white/5 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about equity trusts, maxims, relationships..."
              className="flex-1 bg-[#111827] border-white/10 text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#C6A87C]/50 min-h-[50px] max-h-[150px] resize-none"
              data-testid="chat-input"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5] px-6 disabled:opacity-50"
              data-testid="send-btn"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="font-sans text-xs text-slate-600 mt-2 text-center">
            Answers grounded in: Kingdom vs Empire (Roark) · Pure Trust Under Equity
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
