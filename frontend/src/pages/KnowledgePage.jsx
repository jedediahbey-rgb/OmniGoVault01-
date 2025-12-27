import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
    <div className="min-h-screen bg-vault-dark">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-vault-dark/80 backdrop-blur-md border-b border-vault-gold/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
              <div className="w-10 h-10 bg-vault-gold/20 rounded-lg flex items-center justify-center">
                <Scales className="w-5 h-5 text-vault-gold" weight="duotone" />
              </div>
              <span className="font-heading text-2xl font-semibold text-white tracking-tight">
                Equity Trust Portfolio
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/knowledge" className="text-sm text-vault-gold transition-colors">Knowledge</Link>
              <Link to="/maxims" className="text-sm text-vault-muted hover:text-vault-gold transition-colors">Maxims</Link>
              <Link to="/relationships" className="text-sm text-vault-muted hover:text-vault-gold transition-colors">Relationships</Link>
              <Link to="/templates" className="text-sm text-vault-muted hover:text-vault-gold transition-colors">Templates</Link>
              <Link to="/vault">
                <Button className="bg-vault-gold text-vault-dark hover:bg-vault-gold/90 font-bold uppercase tracking-wider text-xs px-6 py-2 rounded-lg">
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-vault-muted text-sm mb-6">
              <Link to="/" className="hover:text-vault-gold">Home</Link>
              <CaretRight className="w-4 h-4" weight="duotone" />
              <span className="text-vault-gold">Knowledge Base</span>
            </div>
            <div className="flex items-start justify-between gap-8">
              <div>
                <h1 className="font-heading text-5xl text-white mb-4" data-testid="knowledge-title">
                  Knowledge <span className="text-vault-gold">Base</span>
                </h1>
                <p className="text-vault-muted max-w-2xl">
                  Structured learning content derived from authoritative source documents. 
                  Every topic includes citations to the original source material.
                </p>
              </div>
              <div className="w-96">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted" weight="duotone" />
                  <Input
                    type="text"
                    placeholder="Search topics..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#0B1221] border-vault-gold/20 text-white placeholder:text-vault-muted focus:border-vault-gold/50 rounded-full"
                    data-testid="search-input"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="topics-grid">
              {filteredTopics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 * index }}
                  className="group bg-[#0B1221]/80 border border-vault-gold/10 rounded-xl overflow-hidden hover:border-vault-gold/30 transition-all duration-300"
                  data-testid={`topic-${topic.id}`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <BookOpen className="w-8 h-8 text-vault-gold" weight="duotone" />
                      <span className="font-mono text-xs text-vault-muted">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="font-heading text-xl text-white mb-3">{topic.title}</h3>
                    <p className="text-sm text-vault-muted mb-4 leading-relaxed">{topic.description}</p>
                    
                    {/* Subtopics */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {topic.subtopics?.slice(0, 3).map((sub, i) => (
                        <span key={i} className="px-2 py-1 bg-vault-dark text-vault-muted text-xs rounded-lg">
                          {sub}
                        </span>
                      ))}
                      {topic.subtopics?.length > 3 && (
                        <span className="px-2 py-1 text-vault-muted text-xs">
                          +{topic.subtopics.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    {/* Source Citation */}
                    <div className="flex items-center gap-2 text-xs text-vault-muted border-t border-vault-gold/10 pt-4">
                      <FileText className="w-3 h-3" weight="duotone" />
                      <span>{topic.source}</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-vault-dark/50 border-t border-vault-gold/10 group-hover:bg-vault-gold/5 transition-colors">
                    <Link 
                      to={`/assistant?topic=${topic.id}`}
                      className="inline-flex items-center gap-2 text-vault-gold text-sm font-medium"
                    >
                      Ask Assistant About This
                      <ArrowSquareOut className="w-3 h-3" weight="duotone" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {filteredTopics.length === 0 && !loading && (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-vault-muted/30 mx-auto mb-4" weight="duotone" />
              <h3 className="font-heading text-xl text-white mb-2">No topics found</h3>
              <p className="text-vault-muted">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </section>

      {/* Sources Banner */}
      <section className="py-12 px-6 bg-[#0B1221]/80 border-y border-vault-gold/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-vault-gold" weight="duotone" />
              <div>
                <h3 className="font-heading text-lg text-white">View Original Sources</h3>
                <p className="text-sm text-vault-muted">Access the PDF documents that power this knowledge base</p>
              </div>
            </div>
            <Link to="/sources">
              <Button variant="outline" className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10 rounded-lg">
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
