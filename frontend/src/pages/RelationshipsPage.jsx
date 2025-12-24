import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scales, CaretRight, FileText, ArrowLeftRight, Users } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Public API calls (no credentials needed)
const publicApi = axios.create({
  baseURL: API,
  withCredentials: false
});

const RelationshipsPage = () => {
  const [relationships, setRelationships] = useState([]);
  const [selectedRelationship, setSelectedRelationship] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelationships();
  }, []);

  const fetchRelationships = async () => {
    try {
      const response = await publicApi.get(`/knowledge/relationships`);
      setRelationships(response.data);
      if (response.data.length > 0) {
        setSelectedRelationship(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching relationships:", error);
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
                <Scales className="w-5 h-5 text-[#C6A87C]" weight="duotone" />
              </div>
              <span className="font-serif text-2xl font-semibold text-[#F8FAFC] tracking-tight">
                Equity Trust Portfolio
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/knowledge" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors">Knowledge</Link>
              <Link to="/maxims" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors">Maxims</Link>
              <Link to="/relationships" className="font-sans text-sm text-[#C6A87C] transition-colors">Relationships</Link>
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
            <span className="text-[#C6A87C]">Duty ↔ Right Relationships</span>
          </div>
          <h1 className="font-serif text-5xl text-[#F8FAFC] mb-4" data-testid="relationships-title">
            Duty <span className="text-[#C6A87C]">↔</span> Right Explorer
          </h1>
          <p className="font-sans text-slate-400 max-w-2xl">
            Explore the paired relationships between parties in equity. Click on a relationship 
            to see the duties and rights of each party with citations.
          </p>
        </div>
      </section>

      {/* Relationships Explorer */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Relationship Selector */}
              <div className="space-y-3" data-testid="relationship-list">
                {relationships.map((rel) => (
                  <button
                    key={rel.id}
                    onClick={() => setSelectedRelationship(rel)}
                    className={`w-full text-left p-4 rounded-sm transition-all duration-300 ${
                      selectedRelationship?.id === rel.id
                        ? 'bg-[#C6A87C]/10 border border-[#C6A87C]/30'
                        : 'bg-[#111827] border border-white/5 hover:border-white/10'
                    }`}
                    data-testid={`rel-btn-${rel.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <ArrowLeftRight className={`w-5 h-5 ${selectedRelationship?.id === rel.id ? 'text-[#C6A87C]' : 'text-slate-500'}`} />
                      <div>
                        <span className={`font-sans font-medium ${selectedRelationship?.id === rel.id ? 'text-[#C6A87C]' : 'text-[#F8FAFC]'}`}>
                          {rel.left_party}
                        </span>
                        <span className="text-slate-500 mx-2">↔</span>
                        <span className={`font-sans font-medium ${selectedRelationship?.id === rel.id ? 'text-[#C6A87C]' : 'text-[#F8FAFC]'}`}>
                          {rel.right_party}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Relationship Detail */}
              {selectedRelationship && (
                <div className="lg:col-span-2 bg-[#111827] border border-white/5 rounded-sm overflow-hidden" data-testid="relationship-detail">
                  {/* Header */}
                  <div className="p-8 bg-[#0F172A] border-b border-white/5">
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-[#C6A87C]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="w-8 h-8 text-[#C6A87C]" weight="duotone" />
                        </div>
                        <h3 className="font-serif text-xl text-[#F8FAFC]">{selectedRelationship.left_party}</h3>
                        <span className="font-sans text-xs text-slate-500 uppercase tracking-wider">Duty Bearer</span>
                      </div>
                      <ArrowLeftRight className="w-8 h-8 text-[#C6A87C]" weight="duotone" />
                      <div className="text-center">
                        <div className="w-16 h-16 bg-[#C6A87C]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="w-8 h-8 text-[#C6A87C]" weight="duotone" />
                        </div>
                        <h3 className="font-serif text-xl text-[#F8FAFC]">{selectedRelationship.right_party}</h3>
                        <span className="font-sans text-xs text-slate-500 uppercase tracking-wider">Right Holder</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-8 min-w-0 max-w-full">
                    {/* Explanation */}
                    <p className="font-sans text-slate-300 mb-8 leading-relaxed text-center max-w-2xl mx-auto">
                      {selectedRelationship.explanation}
                    </p>

                    {/* Duties and Rights */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Left Party Duties */}
                      <div className="bg-[#0B1221] border border-white/5 rounded-sm p-6">
                        <h4 className="font-serif text-lg text-[#C6A87C] mb-4">
                          {selectedRelationship.left_party}'s Duties
                        </h4>
                        <ul className="space-y-3">
                          {selectedRelationship.left_duties.map((duty, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="w-6 h-6 bg-[#C6A87C]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[#C6A87C] text-xs font-mono">{i + 1}</span>
                              </span>
                              <span className="font-sans text-sm text-slate-300">{duty}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Right Party Rights */}
                      <div className="bg-[#0B1221] border border-white/5 rounded-sm p-6">
                        <h4 className="font-serif text-lg text-[#C6A87C] mb-4">
                          {selectedRelationship.right_party}'s Rights
                        </h4>
                        <ul className="space-y-3">
                          {selectedRelationship.right_rights.map((right, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="w-6 h-6 bg-[#C6A87C]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[#C6A87C] text-xs font-mono">{i + 1}</span>
                              </span>
                              <span className="font-sans text-sm text-slate-300">{right}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Source Citation */}
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-8 pt-6 border-t border-white/5">
                      <FileText className="w-3 h-3" weight="duotone" />
                      <span>{selectedRelationship.source}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RelationshipsPage;
