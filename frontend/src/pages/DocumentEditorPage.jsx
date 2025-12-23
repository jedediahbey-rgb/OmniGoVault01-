import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  Scale, ArrowLeft, Save, Download, User, LogOut, Clock, History, RotateCcw, FileText
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DocumentEditorPage = ({ user, logout }) => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    status: "draft"
  });

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const [docRes, versionsRes] = await Promise.all([
        axios.get(`${API}/documents/${documentId}`),
        axios.get(`${API}/documents/${documentId}/versions`)
      ]);
      setDocument(docRes.data);
      setVersions(versionsRes.data);
      setFormData({
        title: docRes.data.title || "",
        content: docRes.data.content || "",
        status: docRes.data.status || "draft"
      });
    } catch (error) {
      console.error("Error fetching document:", error);
      navigate("/vault");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/documents/${documentId}`, formData);
      toast.success("Document saved");
      fetchDocument(); // Refresh to get new version
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await axios.get(`${API}/documents/${documentId}/export/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${formData.title.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export PDF");
    }
  };

  const handleRestoreVersion = async (versionId) => {
    try {
      await axios.post(`${API}/documents/${documentId}/restore/${versionId}`);
      toast.success("Version restored");
      setShowVersions(false);
      fetchDocument();
    } catch (error) {
      console.error("Error restoring:", error);
      toast.error("Failed to restore version");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const getDocTypeName = (type) => {
    const names = {
      'declaration_of_trust': 'Declaration of Trust',
      'trust_transfer_grant_deed': 'Trust Transfer Grant Deed',
      'acknowledgement_receipt_acceptance': 'Acknowledgement / Receipt / Acceptance',
      'notice_of_interest': 'Notice of Interest',
      'notice_of_delivery': 'Notice of Delivery',
      'special_notice_deed_conveyance': 'Special Notice of Deed of Conveyance',
      'affidavit_of_fact': 'Affidavit of Fact'
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1221] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1221]">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F172A] border-b border-white/5 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 hover:text-[#F8FAFC]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-white/10"></div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#C6A87C]" />
              <div>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-transparent border-0 text-[#F8FAFC] text-lg font-serif p-0 h-auto focus-visible:ring-0"
                  data-testid="doc-title"
                />
                <p className="font-sans text-xs text-slate-500">{getDocTypeName(document?.document_type)} · v{document?.version}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={showVersions} onOpenChange={setShowVersions}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-[#C6A87C]">
                  <History className="w-4 h-4 mr-2" />
                  History
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111827] border-white/10 text-[#F8FAFC]">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl text-[#C6A87C]">Version History</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-4 max-h-[400px] overflow-y-auto">
                  {versions.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No previous versions</p>
                  ) : (
                    versions.map((v) => (
                      <div key={v.version_id} className="flex items-center justify-between p-3 bg-[#0B1221] rounded-sm">
                        <div>
                          <p className="font-sans text-sm text-[#F8FAFC]">Version {v.version_number}</p>
                          <p className="font-sans text-xs text-slate-500">{new Date(v.created_at).toLocaleString()}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRestoreVersion(v.version_id)}
                          className="text-[#C6A87C] hover:bg-[#C6A87C]/10"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restore
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
            
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger className="w-32 bg-[#111827] border-white/10 text-[#F8FAFC]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111827] border-white/10">
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handleExportPDF} className="border-[#C6A87C]/30 text-[#C6A87C] hover:bg-[#C6A87C]/10">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            
            <Button onClick={handleSave} disabled={saving} className="bg-[#C6A87C] text-[#0B1221] hover:bg-[#E8D5B5]" data-testid="save-btn">
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0B1221] border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Editor Area */}
      <main className="pt-20 pb-8 px-8">
        <div className="max-w-4xl mx-auto">
          {/* Editor */}
          <div className="bg-[#111827] border border-white/5 rounded-sm overflow-hidden">
            {/* Editor Header */}
            <div className="px-6 py-4 bg-[#0F172A] border-b border-white/5">
              <p className="font-sans text-sm text-slate-400">
                Edit your document content below. The content will be formatted when exported to PDF.
              </p>
            </div>
            
            {/* Editor Content */}
            <div className="p-6">
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder={`Enter the content for your ${getDocTypeName(document?.document_type)}...

You can include:
- Party information (Grantor, Trustee, Beneficiary)
- Property descriptions
- Trust terms and conditions
- Governing statements
- Additional provisions

The document will be formatted when exported to PDF.`}
                className="min-h-[600px] bg-[#0B1221] border-white/10 text-[#F8FAFC] placeholder:text-slate-600 font-mono text-sm leading-relaxed resize-none"
                data-testid="doc-content"
              />
            </div>
          </div>

          {/* Quick Info */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-[#111827] border border-white/5 rounded-sm p-4">
              <p className="font-sans text-xs text-slate-500 uppercase tracking-wider mb-1">Document Type</p>
              <p className="font-sans text-sm text-[#F8FAFC]">{getDocTypeName(document?.document_type)}</p>
            </div>
            <div className="bg-[#111827] border border-white/5 rounded-sm p-4">
              <p className="font-sans text-xs text-slate-500 uppercase tracking-wider mb-1">Current Version</p>
              <p className="font-sans text-sm text-[#F8FAFC]">v{document?.version}</p>
            </div>
            <div className="bg-[#111827] border border-white/5 rounded-sm p-4">
              <p className="font-sans text-xs text-slate-500 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="font-sans text-sm text-[#F8FAFC]">{new Date(document?.updated_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Template Guide */}
          <div className="mt-6 bg-[#111827] border border-white/5 rounded-sm p-6">
            <h3 className="font-serif text-lg text-[#C6A87C] mb-4">Document Structure Guide</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-sans font-medium text-[#F8FAFC] mb-2">Recommended Sections:</p>
                <ul className="space-y-1 text-slate-400">
                  <li>• Preamble / Introduction</li>
                  <li>• Parties (Grantor, Trustee, Beneficiary)</li>
                  <li>• Trust Purpose</li>
                  <li>• Property Description (Corpus/Res)</li>
                  <li>• Trust Terms & Duration</li>
                  <li>• Powers of Trustee</li>
                  <li>• Governing Statements</li>
                  <li>• Signature Blocks</li>
                </ul>
              </div>
              <div>
                <p className="font-sans font-medium text-[#F8FAFC] mb-2">Citation:</p>
                <p className="text-slate-400 text-xs">
                  This template structure is based on "Pure Trust Under Equity" and follows 
                  the principles outlined in "Kingdom vs Empire" (Roark).
                </p>
                <Link to="/sources" className="text-[#C6A87C] text-xs hover:underline mt-2 inline-block">
                  View Source Documents →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentEditorPage;
