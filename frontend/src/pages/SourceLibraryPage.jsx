import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scales, CaretRight, FileText, ArrowSquareOut, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Public API calls (no credentials needed)
const publicApi = axios.create({
  baseURL: API,
  withCredentials: false
});

const SourceLibraryPage = () => {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await publicApi.get(`/sources`);
      setSources(response.data);
      if (response.data.length > 0) {
        setSelectedSource(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching sources:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-dark">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-vault-dark/80 backdrop-blur-md border-b border-vault-gold/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-vault-gold/20 rounded-lg flex items-center justify-center">
                <Scales className="w-5 h-5 text-vault-gold" weight="duotone" />
              </div>
              <span className="font-heading text-2xl font-semibold text-white tracking-tight">
                Equity Trust Portfolio
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/knowledge" className="text-sm text-vault-muted hover:text-vault-gold transition-colors">Knowledge</Link>
              <Link to="/maxims" className="text-sm text-vault-muted hover:text-vault-gold transition-colors">Maxims</Link>
              <Link to="/templates" className="text-sm text-vault-muted hover:text-vault-gold transition-colors">Templates</Link>
              <Link to="/sources" className="text-sm text-vault-gold transition-colors">Sources</Link>
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
      <section className="pt-32 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-vault-muted text-sm mb-6">
              <Link to="/" className="hover:text-vault-gold">Home</Link>
              <CaretRight className="w-4 h-4" weight="duotone" />
              <span className="text-vault-gold">Source Library</span>
            </div>
            <h1 className="font-heading text-5xl text-white mb-4" data-testid="sources-title">
              Source <span className="text-vault-gold">Library</span>
            </h1>
            <p className="text-vault-muted max-w-2xl">
              Access the authoritative PDF documents that power this knowledge platform. 
              All content is grounded in these sources with citations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Source Selector and Viewer */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Source List */}
              <div className="space-y-4" data-testid="source-list">
                {sources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                      selectedSource?.id === source.id
                        ? 'bg-vault-gold/10 border border-vault-gold/30'
                        : 'bg-[#0B1221]/80 border border-vault-gold/10 hover:border-vault-gold/20'
                    }`}
                    data-testid={`source-btn-${source.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className={`w-6 h-6 mt-1 ${selectedSource?.id === source.id ? 'text-vault-gold' : 'text-vault-muted'}`} />
                      <div>
                        <h3 className={`font-heading text-lg ${selectedSource?.id === source.id ? 'text-vault-gold' : 'text-white'}`}>
                          {source.name}
                        </h3>
                        <p className="text-xs text-vault-muted mt-1">{source.description}</p>
                      </div>
                    </div>
                  </button>
                ))}

                {/* Search within PDF */}
                <div className="pt-4 border-t border-vault-gold/10">
                  <label className="text-xs text-vault-muted uppercase tracking-wider mb-2 block">
                    Search Within Sources
                  </label>
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-muted" weight="duotone" />
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-[#0B1221] border-vault-gold/20 text-white placeholder:text-vault-muted focus:border-vault-gold/50 rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-vault-muted/60 mt-2">
                    Full-text search across PDFs
                  </p>
                </div>
              </div>

              {/* PDF Viewer */}
              <div className="lg:col-span-3">
                {selectedSource && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-[#0B1221]/80 border border-vault-gold/10 rounded-xl overflow-hidden" 
                    data-testid="pdf-viewer"
                  >
                    {/* Viewer Header */}
                    <div className="p-4 bg-vault-dark/50 border-b border-vault-gold/10 flex items-center justify-between">
                      <div>
                        <h2 className="font-heading text-xl text-white">{selectedSource.full_name}</h2>
                        <p className="text-xs text-vault-muted">{selectedSource.description}</p>
                      </div>
                      <a
                        href={selectedSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-vault-gold/10 text-vault-gold rounded-lg hover:bg-vault-gold/20 transition-colors"
                      >
                        <ArrowSquareOut className="w-4 h-4" weight="duotone" />
                        Open PDF
                      </a>
                    </div>

                    {/* Embedded PDF */}
                    <div className="aspect-[4/3] bg-vault-dark">
                      <iframe
                        src={`${selectedSource.url}#toolbar=1&navpanes=1`}
                        className="w-full h-full"
                        title={selectedSource.name}
                      />
                    </div>

                    {/* Citation Tool */}
                    <div className="p-4 bg-vault-dark/50 border-t border-vault-gold/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-vault-muted uppercase tracking-wider">Citation Format:</span>
                          <p className="font-mono text-sm text-vault-muted mt-1">
                            [{selectedSource.name}, Page X]
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-vault-gold hover:bg-vault-gold/10">
                          Copy Citation
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <section className="py-8 px-6 bg-[#0B1221]/80 border-t border-vault-gold/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-vault-muted">
            Source documents provided for reference. Content is derived from and cited to these authoritative sources.
          </p>
        </div>
      </section>
    </div>
  );
};

export default SourceLibraryPage;
