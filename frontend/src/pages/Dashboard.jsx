import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Scale, Plus, FileText, Clock, CheckCircle, Trash2, 
  Download, Edit, LogOut, User, ChevronRight, Search
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, logout }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/trusts`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    
    try {
      await axios.delete(`${API}/trusts/${docId}`);
      setDocuments(documents.filter(d => d.document_id !== docId));
      toast.success("Document deleted successfully");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleDownload = async (docId, title) => {
    try {
      const response = await axios.get(`${API}/trusts/${docId}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDocTypeLabel = (type) => {
    const labels = {
      'declaration_of_trust': 'Declaration of Trust',
      'trust_transfer_grant_deed': 'Trust Transfer Grant Deed',
      'notice_of_intent': 'Notice of Intent',
      'affidavit_of_fact': 'Affidavit of Fact'
    };
    return labels[type] || type;
  };

  const stats = {
    total: documents.length,
    drafts: documents.filter(d => d.status === 'draft').length,
    completed: documents.filter(d => d.status === 'completed').length
  };

  return (
    <div className="min-h-screen bg-[#0B1221] dark">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#111A2F] border-r border-[#2D3748] p-6 flex flex-col z-40">
        <Link to="/dashboard" className="flex items-center gap-3 mb-10" data-testid="dashboard-logo">
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
            className="flex items-center gap-3 px-4 py-3 bg-[#C6A87C]/10 text-[#C6A87C] rounded-sm"
            data-testid="nav-documents"
          >
            <FileText className="w-5 h-5" />
            <span className="font-sans text-sm font-medium">Documents</span>
          </Link>
          <Link 
            to="/trusts/new"
            className="flex items-center gap-3 px-4 py-3 text-[#F9F7F1]/60 hover:text-[#F9F7F1] hover:bg-[#2D3748]/50 rounded-sm transition-colors"
            data-testid="nav-create-new"
          >
            <Plus className="w-5 h-5" />
            <span className="font-sans text-sm font-medium">Create New</span>
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
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[#F9F7F1] mb-2" data-testid="dashboard-title">
              Your Documents
            </h1>
            <p className="font-sans text-[#F9F7F1]/60">
              Manage your trust documents and download as PDF
            </p>
          </div>
          <Link to="/trusts/new" data-testid="create-new-btn">
            <Button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Document
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="vault-card bg-[#111A2F] border-[#2D3748]/50" data-testid="stat-total">
            <p className="font-sans text-xs text-[#F9F7F1]/50 uppercase tracking-wider mb-2">
              Total Documents
            </p>
            <p className="font-serif text-4xl text-[#F9F7F1]">{stats.total}</p>
          </div>
          <div className="vault-card bg-[#111A2F] border-[#2D3748]/50" data-testid="stat-drafts">
            <p className="font-sans text-xs text-[#F9F7F1]/50 uppercase tracking-wider mb-2">
              Drafts
            </p>
            <p className="font-serif text-4xl text-[#C6A87C]">{stats.drafts}</p>
          </div>
          <div className="vault-card bg-[#111A2F] border-[#2D3748]/50" data-testid="stat-completed">
            <p className="font-sans text-xs text-[#F9F7F1]/50 uppercase tracking-wider mb-2">
              Completed
            </p>
            <p className="font-serif text-4xl text-green-500">{stats.completed}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F9F7F1]/40" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#111A2F] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/40 focus:border-[#C6A87C]"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-12 text-center" data-testid="empty-state">
            <FileText className="w-16 h-16 text-[#C6A87C]/30 mx-auto mb-4" />
            <h3 className="font-serif text-xl text-[#F9F7F1] mb-2">
              {searchTerm ? "No documents found" : "No documents yet"}
            </h3>
            <p className="font-sans text-[#F9F7F1]/60 mb-6">
              {searchTerm 
                ? "Try adjusting your search terms" 
                : "Create your first trust document to get started"}
            </p>
            {!searchTerm && (
              <Link to="/trusts/new">
                <Button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Document
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4" data-testid="documents-list">
            {filteredDocuments.map((doc) => (
              <div 
                key={doc.document_id}
                className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6 flex items-center justify-between group"
                data-testid={`document-${doc.document_id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#C6A87C]/10 rounded-sm flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#C6A87C]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-[#F9F7F1] mb-1">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-4">
                      <span className="font-sans text-xs text-[#F9F7F1]/50">
                        {getDocTypeLabel(doc.document_type)}
                      </span>
                      <span className="flex items-center gap-1">
                        {doc.status === 'completed' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span className="font-sans text-xs text-green-500">Completed</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-[#C6A87C]" />
                            <span className="font-sans text-xs text-[#C6A87C]">Draft</span>
                          </>
                        )}
                      </span>
                      <span className="font-sans text-xs text-[#F9F7F1]/40">
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/trusts/${doc.document_id}`)}
                    className="text-[#F9F7F1]/60 hover:text-[#C6A87C] hover:bg-[#C6A87C]/10"
                    data-testid={`edit-${doc.document_id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.document_id, doc.title)}
                    className="text-[#F9F7F1]/60 hover:text-[#C6A87C] hover:bg-[#C6A87C]/10"
                    data-testid={`download-${doc.document_id}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.document_id)}
                    className="text-[#F9F7F1]/60 hover:text-red-500 hover:bg-red-500/10"
                    data-testid={`delete-${doc.document_id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/trusts/${doc.document_id}`)}
                    className="text-[#F9F7F1]/60 hover:text-[#C6A87C]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
