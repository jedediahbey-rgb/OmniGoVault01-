import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Scale, ArrowLeft, Scroll, FileSignature, Shield, 
  GalleryVerticalEnd, ChevronRight, User, LogOut
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateTrust = ({ user, logout }) => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName) => {
    const icons = {
      'scroll': <Scroll className="w-8 h-8" />,
      'file-signature': <FileSignature className="w-8 h-8" />,
      'shield': <Shield className="w-8 h-8" />,
      'scale': <GalleryVerticalEnd className="w-8 h-8" />
    };
    return icons[iconName] || <Scroll className="w-8 h-8" />;
  };

  const handleCreate = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/trusts`, {
        document_type: selectedTemplate,
        title: title.trim()
      });
      
      toast.success("Document created successfully");
      navigate(`/trusts/${response.data.document_id}`);
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error("Failed to create document");
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0B1221] dark">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#111A2F] border-r border-[#2D3748] p-6 flex flex-col z-40">
        <Link to="/dashboard" className="flex items-center gap-3 mb-10" data-testid="sidebar-logo">
          <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-sm flex items-center justify-center">
            <Scale className="w-5 h-5 text-[#C6A87C]" />
          </div>
          <span className="font-serif text-xl font-semibold text-[#F9F7F1] tracking-tight">
            Sovereign Vault
          </span>
        </Link>

        <nav className="flex-1 space-y-2">
          <Link 
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-[#F9F7F1]/60 hover:text-[#F9F7F1] hover:bg-[#2D3748]/50 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-sans text-sm font-medium">Back to Documents</span>
          </Link>
        </nav>

        <div className="border-t border-[#2D3748] pt-6">
          <div className="flex items-center gap-3 mb-4">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 bg-[#C6A87C]/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-[#C6A87C]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-sans text-sm font-medium text-[#F9F7F1] truncate">
                {user?.name || "User"}
              </p>
              <p className="font-sans text-xs text-[#F9F7F1]/50 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="w-full justify-start text-[#F9F7F1]/60 hover:text-[#F9F7F1] hover:bg-[#2D3748]/50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl text-[#F9F7F1] mb-2" data-testid="create-title">
              Create New Document
            </h1>
            <p className="font-sans text-[#F9F7F1]/60">
              Select a template and provide a title to create your trust document
            </p>
          </div>

          {/* Template Selection */}
          <div className="mb-8">
            <h2 className="font-serif text-xl text-[#C6A87C] mb-4">
              Step 1: Select Template
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4" data-testid="template-grid">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`vault-card bg-[#111A2F] p-6 text-left transition-all duration-300 ${
                      selectedTemplate === template.id 
                        ? 'border-[#C6A87C] gold-glow' 
                        : 'border-[#2D3748]/50 hover:border-[#2D3748]'
                    }`}
                    data-testid={`template-${template.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`text-${selectedTemplate === template.id ? '[#C6A87C]' : '[#F9F7F1]/40'} transition-colors`}>
                        {getIcon(template.icon)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-serif text-lg text-[#F9F7F1] mb-2">
                          {template.name}
                        </h3>
                        <p className="font-sans text-sm text-[#F9F7F1]/60 leading-relaxed">
                          {template.description}
                        </p>
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="w-6 h-6 bg-[#C6A87C] rounded-full flex items-center justify-center">
                          <ChevronRight className="w-4 h-4 text-[#0B1221]" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title Input */}
          <div className="mb-8">
            <h2 className="font-serif text-xl text-[#C6A87C] mb-4">
              Step 2: Document Title
            </h2>
            <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6">
              <label className="block font-sans text-sm text-[#F9F7F1]/60 mb-2">
                Enter a descriptive title for your document
              </label>
              <Input
                type="text"
                placeholder="e.g., Smith Family Trust Declaration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C] text-lg py-6"
                data-testid="title-input"
              />
            </div>
          </div>

          {/* Create Button */}
          <div className="flex justify-end gap-4">
            <Link to="/dashboard">
              <Button variant="outline" className="btn-secondary">
                Cancel
              </Button>
            </Link>
            <Button 
              onClick={handleCreate}
              disabled={!selectedTemplate || !title.trim() || creating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="create-btn"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0B1221] border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  Create Document
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateTrust;
