import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scale, ChevronRight, FileText, ExternalLink, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
      const response = await axios.get(`${API}/sources`);
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
    <div className="min-h-screen bg-[#0B1221]">
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
              <Link to="/sources" className="font-sans text-sm text-[#C6A87C] transition-colors">Sources</Link>
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
      <section className="pt-32 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
            <Link to="/" className="hover:text-[#C6A87C]">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#C6A87C]">Source Library</span>
          </div>
          <h1 className="font-serif text-5xl text-[#F8FAFC] mb-4" data-testid="sources-title">
            Source <span className="text-[#C6A87C]">Library</span>
          </h1>
          <p className="font-sans text-slate-400 max-w-2xl">
            Access the authoritative PDF documents that power this knowledge platform. 
            All content is grounded in these sources with citations.
          </p>
        </div>
      </section>

      {/* Source Selector and Viewer */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Source List */}
              <div className="space-y-4" data-testid="source-list">
                {sources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source)}
                    className={`w-full text-left p-4 rounded-sm transition-all duration-300 ${
                      selectedSource?.id === source.id
                        ? 'bg-[#C6A87C]/10 border border-[#C6A87C]/30'
                        : 'bg-[#111827] border border-white/5 hover:border-white/10'
                    }`}
                    data-testid={`source-btn-${source.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className={`w-6 h-6 mt-1 ${selectedSource?.id === source.id ? 'text-[#C6A87C]' : 'text-slate-500'}`} />
                      <div>
                        <h3 className={`font-serif text-lg ${selectedSource?.id === source.id ? 'text-[#C6A87C]' : 'text-[#F8FAFC]'}`}>
                          {source.name}
                        </h3>
                        <p className="font-sans text-xs text-slate-500 mt-1">{source.description}</p>
                      </div>
                    </div>
                  </button>
                ))}

                {/* Search within PDF */}
                <div className="pt-4 border-t border-white/5">
                  <label className="font-sans text-xs text-slate-500 uppercase tracking-wider mb-2 block">
                    Search Within Sources
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-[#111827] border-white/10 text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#C6A87C]/50"
                    />
                  </div>
                  <p className="font-sans text-xs text-slate-600 mt-2">
                    Full-text search across PDFs
                  </p>
                </div>
              </div>

              {/* PDF Viewer */}
              <div className="lg:col-span-3">
                {selectedSource && (
                  <div className="bg-[#111827] border border-white/5 rounded-sm overflow-hidden" data-testid="pdf-viewer">
                    {/* Viewer Header */}
                    <div className="p-4 bg-[#0F172A] border-b border-white/5 flex items-center justify-between">
                      <div>
                        <h2 className="font-serif text-xl text-[#F8FAFC]">{selectedSource.full_name}</h2>
                        <p className="font-sans text-xs text-slate-500">{selectedSource.description}</p>
                      </div>
                      <a
                        href={selectedSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#C6A87C]/10 text-[#C6A87C] rounded-sm hover:bg-[#C6A87C]/20 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open PDF
                      </a>
                    </div>

                    {/* Embedded PDF */}
                    <div className="aspect-[4/3] bg-[#0B1221]">
                      <iframe
                        src={`${selectedSource.url}#toolbar=1&navpanes=1`}
                        className="w-full h-full"
                        title={selectedSource.name}
                      />
                    </div>

                    {/* Citation Tool */}
                    <div className="p-4 bg-[#0F172A] border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-sans text-xs text-slate-500 uppercase tracking-wider">Citation Format:</span>
                          <p className="font-mono text-sm text-slate-400 mt-1">
                            [{selectedSource.name}, Page X]
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-[#C6A87C]">
                          Copy Citation
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 px-6 bg-[#0F172A] border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-sans text-xs text-slate-500">
            Source documents are provided for educational purposes. All content on this platform 
            is derived from and cited to these authoritative sources.
          </p>
        </div>
      </section>
    </div>
  );
};

export default SourceLibraryPage;
