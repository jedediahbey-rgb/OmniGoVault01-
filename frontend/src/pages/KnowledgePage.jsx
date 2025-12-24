import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scales, BookOpen, CaretRight, MagnifyingGlass, FileText, ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Public API calls (no credentials needed)
const publicApi = axios.create({
  baseURL: API,
  withCredentials: false
});

const KnowledgePage = () => {
  const [topics, setTopics] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await publicApi.get(`/knowledge/topics`);
      setTopics(response.data);
    } catch (error) {
      console.error("Error fetching topics:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = topics.filter(topic =>
    topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    topic.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B1221]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B1221]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center">
                <Scales className="w-5 h-5 text-[#C6A87C]" weight="duotone" />
              </div>
              <span className="font-serif text-2xl font-semibold text-[#F8FAFC] tracking-tight">
                Equity Trust Portfolio
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/knowledge" className="font-sans text-sm text-[#C6A87C] transition-colors">Knowledge</Link>
              <Link to="/maxims" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors">Maxims</Link>
              <Link to="/relationships" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors">Relationships</Link>
              <Link to="/templates" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors">Templates</Link>
              <Link to="/vault">
                <Button className="bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5] font-sans font-bold uppercase tracking-wider text-xs px-6 py-2 rounded-sm">
                  Vault
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
            <Link to="/" className="hover:text-[#C6A87C]">Home</Link>
            <CaretRight className="w-4 h-4" weight="duotone" />
            <span className="text-[#C6A87C]">Knowledge Base</span>
          </div>
          <div className="flex items-start justify-between gap-8">
            <div>
              <h1 className="font-serif text-5xl text-[#F8FAFC] mb-4" data-testid="knowledge-title">
                Knowledge <span className="text-[#C6A87C]">Base</span>
              </h1>
              <p className="font-sans text-slate-400 max-w-2xl">
                Structured learning content derived from authoritative source documents. 
                Every topic includes citations to the original source material.
              </p>
            </div>
            <div className="w-96">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" weight="duotone" />
                <Input
                  type="text"
                  placeholder="Search topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#111827] border-white/10 text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#C6A87C]/50 rounded-full"
                  data-testid="search-input"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Topics SquaresFour */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="topics-grid">
              {filteredTopics.map((topic, index) => (
                <div
                  key={topic.id}
                  className="group bg-[#111827] border border-white/5 rounded-sm overflow-hidden hover:border-[#C6A87C]/30 transition-all duration-300"
                  data-testid={`topic-${topic.id}`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <BookOpen className="w-8 h-8 text-[#C6A87C]" weight="duotone" />
                      <span className="font-mono text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="font-serif text-xl text-[#F8FAFC] mb-3">{topic.title}</h3>
                    <p className="font-sans text-sm text-slate-400 mb-4 leading-relaxed">{topic.description}</p>
                    
                    {/* Subtopics */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {topic.subtopics?.slice(0, 3).map((sub, i) => (
                        <span key={i} className="px-2 py-1 bg-[#1E293B] text-slate-400 text-xs rounded-sm">
                          {sub}
                        </span>
                      ))}
                      {topic.subtopics?.length > 3 && (
                        <span className="px-2 py-1 text-slate-500 text-xs">
                          +{topic.subtopics.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    {/* Source Citation */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-white/5 pt-4">
                      <FileText className="w-3 h-3" weight="duotone" />
                      <span>{topic.source}</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-[#0F172A] border-t border-white/5 group-hover:bg-[#C6A87C]/5 transition-colors">
                    <Link 
                      to={`/assistant?topic=${topic.id}`}
                      className="inline-flex items-center gap-2 text-[#C6A87C] font-sans text-sm font-medium"
                    >
                      Ask Assistant About This
                      <ArrowSquareOut className="w-3 h-3" weight="duotone" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredTopics.length === 0 && !loading && (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" weight="duotone" />
              <h3 className="font-serif text-xl text-[#F8FAFC] mb-2">No topics found</h3>
              <p className="font-sans text-slate-400">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </section>

      {/* Sources Banner */}
      <section className="py-12 px-6 bg-[#0F172A] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-[#C6A87C]" weight="duotone" />
              <div>
                <h3 className="font-serif text-lg text-[#F8FAFC]">View Original Sources</h3>
                <p className="font-sans text-sm text-slate-400">Access the PDF documents that power this knowledge base</p>
              </div>
            </div>
            <Link to="/sources">
              <Button variant="outline" className="border-[#C6A87C]/30 text-[#C6A87C] hover:bg-[#C6A87C]/10">
                Source Library
                <CaretRight className="w-4 h-4 ml-2" weight="duotone" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default KnowledgePage;
