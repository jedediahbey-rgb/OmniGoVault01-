import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
              <Link to="/relationships" className="text-sm text-vault-gold transition-colors">Relationships</Link>
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
              <span className="text-vault-gold">Duty ↔ Right Relationships</span>
            </div>
            <h1 className="font-heading text-5xl text-white mb-4" data-testid="relationships-title">
              Duty <span className="text-vault-gold">↔</span> Right Explorer
            </h1>
            <p className="text-vault-muted max-w-2xl">
              Explore the paired relationships between parties in equity. Click on a relationship 
              to see the duties and rights of each party with citations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Relationships Explorer */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-vault-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Relationship Selector */}
              <div className="space-y-3" data-testid="relationship-list">
                {relationships.map((rel) => (
                  <button
                    key={rel.id}
                    onClick={() => setSelectedRelationship(rel)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                      selectedRelationship?.id === rel.id
                        ? 'bg-vault-gold/10 border border-vault-gold/30'
                        : 'bg-[#0B1221]/80 border border-vault-gold/10 hover:border-vault-gold/20'
                    }`}
                    data-testid={`rel-btn-${rel.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <ArrowLeftRight className={`w-5 h-5 ${selectedRelationship?.id === rel.id ? 'text-vault-gold' : 'text-vault-muted'}`} />
                      <div>
                        <span className={`font-medium ${selectedRelationship?.id === rel.id ? 'text-vault-gold' : 'text-white'}`}>
                          {rel.left_party}
                        </span>
                        <span className="text-vault-muted mx-2">↔</span>
                        <span className={`font-medium ${selectedRelationship?.id === rel.id ? 'text-vault-gold' : 'text-white'}`}>
                          {rel.right_party}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Relationship Detail */}
              {selectedRelationship && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="lg:col-span-2 bg-[#0B1221]/80 border border-vault-gold/10 rounded-xl overflow-hidden" 
                  data-testid="relationship-detail"
                >
                  {/* Header */}
                  <div className="p-8 bg-vault-dark/50 border-b border-vault-gold/10">
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-vault-gold/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="w-8 h-8 text-vault-gold" weight="duotone" />
                        </div>
                        <h3 className="font-heading text-xl text-white">{selectedRelationship.left_party}</h3>
                        <span className="text-xs text-vault-muted uppercase tracking-wider">Duty Bearer</span>
                      </div>
                      <ArrowLeftRight className="w-8 h-8 text-vault-gold" weight="duotone" />
                      <div className="text-center">
                        <div className="w-16 h-16 bg-vault-gold/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="w-8 h-8 text-vault-gold" weight="duotone" />
                        </div>
                        <h3 className="font-heading text-xl text-white">{selectedRelationship.right_party}</h3>
                        <span className="text-xs text-vault-muted uppercase tracking-wider">Right Holder</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-8 min-w-0 max-w-full">
                    {/* Explanation */}
                    <p className="text-white/80 mb-8 leading-relaxed text-center max-w-2xl mx-auto">
                      {selectedRelationship.explanation}
                    </p>

                    {/* Duties and Rights */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Left Party Duties */}
                      <div className="bg-vault-dark border border-vault-gold/10 rounded-xl p-6">
                        <h4 className="font-heading text-lg text-vault-gold mb-4">
                          {selectedRelationship.left_party}'s Duties
                        </h4>
                        <ul className="space-y-3">
                          {selectedRelationship.left_duties.map((duty, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="w-6 h-6 bg-vault-gold/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-vault-gold text-xs font-mono">{i + 1}</span>
                              </span>
                              <span className="text-sm text-white/80">{duty}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Right Party Rights */}
                      <div className="bg-vault-dark border border-vault-gold/10 rounded-xl p-6">
                        <h4 className="font-heading text-lg text-vault-gold mb-4">
                          {selectedRelationship.right_party}'s Rights
                        </h4>
                        <ul className="space-y-3">
                          {selectedRelationship.right_rights.map((right, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="w-6 h-6 bg-vault-gold/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-vault-gold text-xs font-mono">{i + 1}</span>
                              </span>
                              <span className="text-sm text-white/80">{right}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Source Citation */}
                    <div className="flex items-center justify-center gap-2 text-xs text-vault-muted mt-8 pt-6 border-t border-vault-gold/10">
                      <FileText className="w-3 h-3" weight="duotone" />
                      <span>{selectedRelationship.source}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RelationshipsPage;
