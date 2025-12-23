import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  Scale, ArrowLeft, Save, Download, User, LogOut,
  FileText, CheckCircle, Clock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EditTrust = ({ user, logout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    status: "draft",
    grantor_name: "",
    grantor_address: "",
    trustee_name: "",
    trustee_address: "",
    beneficiary_name: "",
    beneficiary_address: "",
    trust_name: "",
    trust_purpose: "",
    property_description: "",
    additional_terms: ""
  });

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`${API}/trusts/${id}`);
      setDocument(response.data);
      setFormData({
        title: response.data.title || "",
        status: response.data.status || "draft",
        grantor_name: response.data.grantor_name || "",
        grantor_address: response.data.grantor_address || "",
        trustee_name: response.data.trustee_name || "",
        trustee_address: response.data.trustee_address || "",
        beneficiary_name: response.data.beneficiary_name || "",
        beneficiary_address: response.data.beneficiary_address || "",
        trust_name: response.data.trust_name || "",
        trust_purpose: response.data.trust_purpose || "",
        property_description: response.data.property_description || "",
        additional_terms: response.data.additional_terms || ""
      });
    } catch (error) {
      console.error("Error fetching document:", error);
      toast.error("Document not found");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/trusts/${id}`, formData);
      toast.success("Document saved successfully");
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get(`${API}/trusts/${id}/pdf`, {
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

  const getDocTypeLabel = (type) => {
    const labels = {
      'declaration_of_trust': 'Declaration of Trust',
      'trust_transfer_grant_deed': 'Trust Transfer Grant Deed',
      'notice_of_intent': 'Notice of Intent to Preserve Interest',
      'affidavit_of_fact': 'Affidavit of Fact'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1221] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#C6A87C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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

        {/* Document Info */}
        <div className="border-t border-[#2D3748] pt-6 mb-6">
          <div className="vault-card bg-[#0B1221] border-[#2D3748] p-4">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-5 h-5 text-[#C6A87C]" />
              <span className="font-sans text-xs text-[#F9F7F1]/50 uppercase tracking-wider">
                Document Type
              </span>
            </div>
            <p className="font-serif text-sm text-[#F9F7F1]">
              {getDocTypeLabel(document?.document_type)}
            </p>
          </div>
        </div>

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl text-[#F9F7F1] mb-2" data-testid="edit-title">
                Edit Document
              </h1>
              <p className="font-sans text-[#F9F7F1]/60">
                Fill in the details for your trust document
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleDownload}
                variant="outline" 
                className="btn-secondary"
                data-testid="download-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                data-testid="save-btn"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0B1221] border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-8">
            {/* Basic Info */}
            <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6">
              <h2 className="font-serif text-xl text-[#C6A87C] mb-6">
                Basic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Document Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] focus:border-[#C6A87C]"
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger 
                      className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] focus:border-[#C6A87C]"
                      data-testid="select-status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111A2F] border-[#2D3748]">
                      <SelectItem value="draft" className="text-[#F9F7F1]">
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#C6A87C]" />
                          Draft
                        </span>
                      </SelectItem>
                      <SelectItem value="completed" className="text-[#F9F7F1]">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Completed
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Grantor */}
            <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6">
              <h2 className="font-serif text-xl text-[#C6A87C] mb-6">
                Grantor/Settlor Information
              </h2>
              <p className="font-sans text-sm text-[#F9F7F1]/50 mb-4">
                The Grantor/Settlor is the creator of the Trust who transfers property into the Trust for the benefit of the Beneficiary. 
                By their freewill act and Deed, the Grantor executes this acknowledgement, receipt, and acceptance for private lawful consideration.
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Full Legal Name</Label>
                  <Input
                    value={formData.grantor_name}
                    onChange={(e) => handleChange('grantor_name', e.target.value)}
                    placeholder="Enter grantor's full legal name"
                    className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C]"
                    data-testid="input-grantor-name"
                  />
                </div>
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Address</Label>
                  <Textarea
                    value={formData.grantor_address}
                    onChange={(e) => handleChange('grantor_address', e.target.value)}
                    placeholder="Enter grantor's full address"
                    className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C] min-h-[80px]"
                    data-testid="input-grantor-address"
                  />
                </div>
              </div>
            </div>

            {/* Trustee */}
            <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6">
              <h2 className="font-serif text-xl text-[#C6A87C] mb-6">
                Trustee Information
              </h2>
              <p className="font-sans text-sm text-[#F9F7F1]/50 mb-4">
                The Trustee holds legal title to the Trust property and has full dispositive and discretionary powers to manage, 
                sell, convey, pledge, mortgage, lease, or transfer title to any interest in real or personal property for the benefit of the Beneficiary.
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Full Legal Name</Label>
                  <Input
                    value={formData.trustee_name}
                    onChange={(e) => handleChange('trustee_name', e.target.value)}
                    placeholder="Enter trustee's full legal name"
                    className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C]"
                    data-testid="input-trustee-name"
                  />
                </div>
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Address</Label>
                  <Textarea
                    value={formData.trustee_address}
                    onChange={(e) => handleChange('trustee_address', e.target.value)}
                    placeholder="Enter trustee's full address"
                    className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C] min-h-[80px]"
                    data-testid="input-trustee-address"
                  />
                </div>
              </div>
            </div>

            {/* Beneficiary */}
            <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6">
              <h2 className="font-serif text-xl text-[#C6A87C] mb-6">
                Beneficiary Information
              </h2>
              <p className="font-sans text-sm text-[#F9F7F1]/50 mb-4">
                The Beneficiary is the true owner in equity who possesses all right, title and interest in the Trust. 
                The Beneficiary holds equitable title and is competent with age of majority sufficient to terminate any presumed or express trust relation.
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Full Legal Name</Label>
                  <Input
                    value={formData.beneficiary_name}
                    onChange={(e) => handleChange('beneficiary_name', e.target.value)}
                    placeholder="Enter beneficiary's full legal name"
                    className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C]"
                    data-testid="input-beneficiary-name"
                  />
                </div>
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Address</Label>
                  <Textarea
                    value={formData.beneficiary_address}
                    onChange={(e) => handleChange('beneficiary_address', e.target.value)}
                    placeholder="Enter beneficiary's full address"
                    className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C] min-h-[80px]"
                    data-testid="input-beneficiary-address"
                  />
                </div>
              </div>
            </div>

            {/* Trust Details */}
            <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6">
              <h2 className="font-serif text-xl text-[#C6A87C] mb-6">
                Trust Details
              </h2>
              <p className="font-sans text-sm text-[#F9F7F1]/50 mb-4">
                The Trust shall be administered, managed, governed and regulated according to the laws of equity 
                and the Maxims of Equity, under judicial power and inherited civilian due process protections.
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Trust Name</Label>
                  <Input
                    value={formData.trust_name}
                    onChange={(e) => handleChange('trust_name', e.target.value)}
                    placeholder="e.g., The Smith Family Living Estate Trust"
                    className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C]"
                    data-testid="input-trust-name"
                  />
                </div>
                <div>
                  <Label className="text-[#F9F7F1]/70 mb-2 block">Trust Purpose</Label>
                  <Textarea
                    value={formData.trust_purpose}
                    onChange={(e) => handleChange('trust_purpose', e.target.value)}
                    placeholder="e.g., To re-unite, deliver, transfer, merge titles for all the corpus of this Trust for the use and benefit of the Beneficiary..."
                    className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C] min-h-[100px]"
                    data-testid="input-trust-purpose"
                  />
                </div>
              </div>
            </div>

            {/* Property Description */}
            <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6">
              <h2 className="font-serif text-xl text-[#C6A87C] mb-6">
                Trust Property (Corpus/Res)
              </h2>
              <p className="font-sans text-sm text-[#F9F7F1]/50 mb-4">
                Describe the corpus (res) of the Trust - all property, assets, real estate, or rights being transferred 
                and conveyed to the Trustee to be held in trust. This forms the principal amount of the Trust estate.
              </p>
              <Textarea
                value={formData.property_description}
                onChange={(e) => handleChange('property_description', e.target.value)}
                placeholder="e.g., All real property located at [ADDRESS], including all improvements, fixtures, and appurtenances thereto; Personal property including [DESCRIPTION]; All rights, titles, deeds, and interests associated therewith..."
                className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C] min-h-[150px]"
                data-testid="input-property-description"
              />
            </div>

            {/* Additional Terms */}
            <div className="vault-card bg-[#111A2F] border-[#2D3748]/50 p-6">
              <h2 className="font-serif text-xl text-[#C6A87C] mb-6">
                Additional Terms & Conditions
              </h2>
              <p className="font-sans text-sm text-[#F9F7F1]/50 mb-4">
                Include any additional terms, conditions, or special provisions.
              </p>
              <Textarea
                value={formData.additional_terms}
                onChange={(e) => handleChange('additional_terms', e.target.value)}
                placeholder="Enter any additional terms, conditions, or provisions..."
                className="bg-[#0B1221] border-[#2D3748] text-[#F9F7F1] placeholder:text-[#F9F7F1]/30 focus:border-[#C6A87C] min-h-[150px]"
                data-testid="input-additional-terms"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <Link to="/dashboard">
                <Button variant="outline" className="btn-secondary">
                  Cancel
                </Button>
              </Link>
              <Button 
                onClick={handleDownload}
                variant="outline" 
                className="btn-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0B1221] border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditTrust;
