import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scale, Search, ChevronRight, FileText, Tag, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MaximsPage = () => {
  const [maxims, setMaxims] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaxims();
  }, []);

  const fetchMaxims = async () => {
    try {
      const response = await axios.get(`${API}/knowledge/maxims`);
      setMaxims(response.data);
    } catch (error) {
      console.error("Error fetching maxims:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get all unique tags
  const allTags = [...new Set(maxims.flatMap(m => m.tags || []))];

  const filteredMaxims = maxims.filter(maxim => {
    const matchesSearch = maxim.maxim.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         maxim.explanation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || (maxim.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

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
              <Link to="/maxims" className="font-sans text-sm text-[#C6A87C] transition-colors">Maxims</Link>
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
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#C6A87C]">Maxims of Equity</span>
          </div>
          <h1 className="font-serif text-5xl text-[#F8FAFC] mb-4" data-testid="maxims-title">
            Maxims of <span className="text-[#C6A87C]">Equity</span>
          </h1>
          <p className="font-sans text-slate-400 max-w-2xl mb-8">
            The foundational principles that govern equitable jurisprudence. Each maxim includes 
            its explanation, source citation, and related doctrines.
          </p>

          {/* Search and Filter */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Search maxims..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#111827] border-white/10 text-[#F8FAFC] placeholder:text-slate-500 focus:border-[#C6A87C]/50 rounded-full"
                data-testid="maxim-search"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTag === null ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedTag(null)}
                className={selectedTag === null ? "bg-[#C6A87C] text-[#0B1221]" : "text-slate-400 hover:text-[#C6A87C]"}
              >
                All
              </Button>
              {allTags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                  className={selectedTag === tag ? "bg-[#C6A87C] text-[#0B1221]" : "text-slate-400 hover:text-[#C6A87C]"}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Maxims Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6" data-testid="maxims-grid">
              {filteredMaxims.map((maxim) => (
                <div
                  key={maxim.id}
                  className="group bg-[#111827] border border-white/5 rounded-sm overflow-hidden hover:border-[#C6A87C]/30 transition-all duration-300"
                  data-testid={`maxim-${maxim.id}`}
                >
                  <div className="p-8">
                    {/* Maxim Number Badge */}
                    <div className="flex items-center justify-between mb-6">
                      <span className="w-10 h-10 bg-[#C6A87C]/20 rounded-full flex items-center justify-center font-serif text-[#C6A87C] text-lg">
                        {maxim.id}
                      </span>
                      <div className="flex gap-2">
                        {(maxim.tags || []).map(tag => (
                          <span 
                            key={tag}
                            className="px-2 py-1 bg-[#1E293B] text-slate-400 text-xs rounded-full cursor-pointer hover:bg-[#C6A87C]/10 hover:text-[#C6A87C]"
                            onClick={() => setSelectedTag(tag)}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Maxim Text */}
                    <h3 className="font-serif text-xl text-[#C6A87C] italic mb-4 leading-relaxed">
                      "{maxim.maxim}"
                    </h3>

                    {/* Explanation */}
                    <p className="font-sans text-slate-300 mb-6 leading-relaxed">
                      {maxim.explanation}
                    </p>

                    {/* Related Doctrines */}
                    {maxim.related_doctrines && maxim.related_doctrines.length > 0 && (
                      <div className="mb-4">
                        <span className="font-sans text-xs text-slate-500 uppercase tracking-wider">Related Doctrines:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {maxim.related_doctrines.map((doctrine, i) => (
                            <span key={i} className="px-2 py-1 bg-[#0B1221] text-slate-400 text-xs rounded-sm border border-white/5">
                              {doctrine}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source Citation */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-4 border-t border-white/5">
                      <FileText className="w-3 h-3" />
                      <span>{maxim.source}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredMaxims.length === 0 && !loading && (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-[#F8FAFC] mb-2">No maxims found</h3>
              <p className="font-sans text-slate-400">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MaximsPage;
