import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scale, ChevronRight, FileText, Scroll, FileSignature, CheckCircle, Bell, Package, Stamp, Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Public API calls (no credentials needed)
const publicApi = axios.create({
  baseURL: API,
  withCredentials: false
});

const TemplatesPage = ({ user }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await publicApi.get(`/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName) => {
    const icons = {
      'scroll': <Scroll className="w-8 h-8" />,
      'file-signature': <FileSignature className="w-8 h-8" />,
      'check-circle': <CheckCircle className="w-8 h-8" />,
      'bell': <Bell className="w-8 h-8" />,
      'package': <Package className="w-8 h-8" />,
      'stamp': <Stamp className="w-8 h-8" />,
      'scale': <Scale className="w-8 h-8" />
    };
    return icons[iconName] || <FileText className="w-8 h-8" />;
  };

  const handleUseTemplate = (templateId) => {
    if (user) {
      navigate(`/vault?create=true&template=${templateId}`);
    } else {
      navigate("/login");
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
              <Link to="/relationships" className="font-sans text-sm text-slate-400 hover:text-[#C6A87C] transition-colors">Relationships</Link>
              <Link to="/templates" className="font-sans text-sm text-[#C6A87C] transition-colors">Templates</Link>
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
            <span className="text-[#C6A87C]">Document Templates</span>
          </div>
          <h1 className="font-serif text-5xl text-[#F8FAFC] mb-4" data-testid="templates-title">
            Document <span className="text-[#C6A87C]">Templates</span>
          </h1>
          <p className="font-sans text-slate-400 max-w-2xl">
            Professional trust document templates derived from "Pure Trust Under Equity". 
            Each template includes locked sections with editable fields for customization.
          </p>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="templates-grid">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group bg-[#111827] border border-white/5 rounded-sm overflow-hidden hover:border-[#C6A87C]/30 transition-all duration-300"
                  data-testid={`template-${template.id}`}
                >
                  <div className="p-6">
                    {/* Icon */}
                    <div className="text-[#C6A87C] mb-6 group-hover:scale-110 transition-transform duration-300">
                      {getIcon(template.icon)}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-xl text-[#F8FAFC] mb-3">{template.name}</h3>

                    {/* Description */}
                    <p className="font-sans text-sm text-slate-400 mb-4 leading-relaxed">{template.description}</p>

                    {/* Fields */}
                    <div className="mb-4">
                      <span className="font-sans text-xs text-slate-500 uppercase tracking-wider">Fields:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {template.fields?.slice(0, 4).map((field, i) => (
                          <span key={i} className="px-2 py-1 bg-[#1E293B] text-slate-400 text-xs rounded-sm">
                            {field}
                          </span>
                        ))}
                        {template.fields?.length > 4 && (
                          <span className="px-2 py-1 text-slate-500 text-xs">
                            +{template.fields.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Source Citation */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-4 border-t border-white/5">
                      <FileText className="w-3 h-3" />
                      <span>{template.source}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 bg-[#0F172A] border-t border-white/5">
                    <Button
                      onClick={() => handleUseTemplate(template.id)}
                      className="w-full bg-[#C6A87C]/10 text-[#C6A87C] hover:bg-[#C6A87C] hover:text-[#0B1221] font-sans font-semibold text-sm"
                    >
                      {user ? (
                        <>Use Template</>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Login to Use
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info Banner */}
      <section className="py-12 px-6 bg-[#0F172A] border-y border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-sans text-slate-400 mb-4">
            Templates are for educational and document organization purposes only. 
            Consult a qualified professional for legal advice.
          </p>
          {!user && (
            <Link to="/login">
              <Button className="bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5] font-sans font-bold uppercase tracking-wider text-xs px-8 py-3 rounded-sm">
                Login to Create Documents
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default TemplatesPage;
