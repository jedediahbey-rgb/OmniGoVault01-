import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import MonoChip from '../components/shared/MonoChip';
import {
  ArrowLeft,
  Clock,
  Envelope,
  FileText,
  FloppyDisk,
  Plus,
  Question,
  Upload,
  Trash,
  Image as ImageIcon,
  FilePdf
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '../components/ui/tooltip';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TrustProfilePage({ user }) {
  const { portfolioId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [mailEvents, setMailEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // File upload state for RM-ID evidence
  const [rmIdFiles, setRmIdFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form state
  const [form, setForm] = useState({
    trust_name: '',
    trust_identifier: '',
    creation_date: '',
    grantor_name: '',
    grantor_address: '',
    trustee_name: '',
    trustee_address: '',
    co_trustee_name: '',
    co_trustee_address: '',
    beneficiary_name: '',
    beneficiary_address: '',
    governing_statements: '',
    trust_term: '',
    additional_notes: '',
    // RM-ID System (Enhanced)
    rm_id_raw: '',
    rm_id_normalized: '',
    rm_id_is_placeholder: false,
    rm_record_id: '', // Legacy
    rm_series_start: '01.001',
    rm_series_end: '99.999',
    // Tax IDs
    trust_ein: '',
    estate_ein: '',
    tax_classification: '',
    tax_notes: ''
  });
  const [generatingPlaceholder, setGeneratingPlaceholder] = useState(false);

  useEffect(() => {
    fetchData();
  }, [portfolioId]);

  const fetchData = async () => {
    try {
      const [profileRes, mailRes] = await Promise.all([
        axios.get(`${API}/portfolios/${portfolioId}/trust-profile`),
        Promise.resolve({ data: [] }) // Envelope events will be fetched if profile exists
      ]);
      
      if (profileRes.data) {
        setProfile(profileRes.data);
        setForm({ ...form, ...profileRes.data });
        // Fetch mail events if profile exists
        const eventsRes = await axios.get(`${API}/trust-profiles/${profileRes.data.profile_id}/mail-events`);
        setMailEvents(eventsRes.data || []);
      }
    } catch (error) {
      // No existing profile - that's okay
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const generatePlaceholderRmId = async () => {
    if (!profile) {
      toast.error('Please save the trust profile first');
      return;
    }
    setGeneratingPlaceholder(true);
    try {
      const response = await axios.post(`${API}/trust-profiles/${profile.profile_id}/generate-placeholder-rm-id`);
      setForm(prev => ({
        ...prev,
        rm_id_raw: response.data.rm_id_raw,
        rm_id_normalized: response.data.rm_id_normalized,
        rm_id_is_placeholder: true,
        rm_record_id: response.data.rm_id_raw
      }));
      setProfile(response.data.profile);
      toast.success('Placeholder RM-ID generated. Replace with your actual sticker number when available.');
    } catch (error) {
      toast.error('Failed to generate placeholder RM-ID');
    } finally {
      setGeneratingPlaceholder(false);
    }
  };

  const saveProfile = async () => {
    if (!form.trust_name.trim()) {
      toast.error('Trust name is required');
      return;
    }

    setSaving(true);
    try {
      if (profile) {
        // Update existing
        await axios.put(`${API}/trust-profiles/${profile.profile_id}`, form);
        toast.success('Trust profile updated');
        // Refresh the data
        fetchData();
      } else {
        // Create new
        const response = await axios.post(`${API}/trust-profiles`, {
          portfolio_id: portfolioId,
          trust_name: form.trust_name
        });
        setProfile(response.data);
        // Then update with all fields
        await axios.put(`${API}/trust-profiles/${response.data.profile_id}`, form);
        toast.success('Trust profile created');
        // Refresh the data
        fetchData();
      }
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save trust profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle RM-ID file upload
  const handleRmIdFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image (JPG, PNG, WebP) or PDF file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingFile(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'rm_id_evidence');
      formData.append('portfolio_id', portfolioId);
      
      const response = await axios.post(`${API}/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      
      // Add to local state
      setRmIdFiles(prev => [...prev, {
        file_id: response.data.file_id,
        filename: response.data.filename || file.name,
        file_type: file.type,
        uploaded_at: new Date().toISOString()
      }]);
      
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle file deletion
  const handleDeleteRmIdFile = async (fileId) => {
    try {
      await axios.delete(`${API}/files/${fileId}`, { withCredentials: true });
      setRmIdFiles(prev => prev.filter(f => f.file_id !== fileId));
      toast.success('File deleted');
    } catch (error) {
      console.error('File delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-full overflow-x-hidden">
      <button
        onClick={() => navigate(`/vault/portfolio/${portfolioId}`)}
        className="flex items-center gap-2 text-white/40 hover:text-white mb-3 sm:mb-4 transition-colors text-sm sm:text-base"
      >
        <ArrowLeft className="w-4 h-4" weight="duotone" /> Back to Portfolio
      </button>

      <PageHeader
        icon={FileText}
        title={profile ? 'Edit Trust Profile' : 'Create Trust Profile'}
        subtitle="Configure trust details, RM-ID tracking, and tax identifiers."
        actions={
          <Button onClick={saveProfile} disabled={saving} className="btn-primary h-8 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
            <FloppyDisk className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" weight="duotone" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 sm:mt-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="bg-white/5 border border-white/10 p-1 inline-flex min-w-max sm:flex sm:min-w-0 sm:flex-wrap gap-1">
            <TabsTrigger value="general" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm px-2 sm:px-3">
              General
            </TabsTrigger>
            <TabsTrigger value="parties" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm px-2 sm:px-3">
              Parties
            </TabsTrigger>
            <TabsTrigger value="rm-id" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
              RM-ID
            </TabsTrigger>
            <TabsTrigger value="tax-ids" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
              Tax IDs
            </TabsTrigger>
            <TabsTrigger value="mail-log" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
              Envelope
            </TabsTrigger>
          </TabsList>
        </div>

        {/* General Tab */}
        <TabsContent value="general" className="mt-4 sm:mt-6">
          <GlassCard className="!p-3 sm:!p-6">
            <h3 className="font-heading text-base sm:text-lg text-white mb-4 sm:mb-6">Trust Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              <div className="min-w-0">
                <Label className="text-white/60 text-xs sm:text-sm">Trust Name *</Label>
                <Input
                  value={form.trust_name}
                  onChange={e => handleChange('trust_name', e.target.value)}
                  placeholder="e.g., Smith Family Trust"
                  className="mt-1 bg-white/5 border-white/10 text-white w-full h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-white/60 text-xs sm:text-sm">Trust Identifier</Label>
                <Input
                  value={form.trust_identifier}
                  onChange={e => handleChange('trust_identifier', e.target.value)}
                  placeholder="Internal reference"
                  className="mt-1 bg-white/5 border-white/10 text-white w-full h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-white/60 text-xs sm:text-sm">Creation Date</Label>
                <Input
                  type="date"
                  value={form.creation_date}
                  onChange={e => handleChange('creation_date', e.target.value)}
                  className="mt-1 bg-white/5 border-white/10 text-white w-full h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-white/60 text-xs sm:text-sm">Trust Term</Label>
                <Input
                  value={form.trust_term}
                  onChange={e => handleChange('trust_term', e.target.value)}
                  placeholder="e.g., 21 years, Perpetual"
                  className="mt-1 bg-white/5 border-white/10 text-white w-full h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="md:col-span-2 min-w-0">
                <Label className="text-white/60 text-xs sm:text-sm">Governing Statements</Label>
                <Textarea
                  value={form.governing_statements}
                  onChange={e => handleChange('governing_statements', e.target.value)}
                  placeholder="Key governing principles..."
                  className="mt-1 bg-white/5 border-white/10 text-white min-h-[80px] sm:min-h-[100px] w-full text-sm"
                />
              </div>
              <div className="md:col-span-2 min-w-0">
                <Label className="text-white/60 text-xs sm:text-sm">Additional Notes</Label>
                <Textarea
                  value={form.additional_notes}
                  onChange={e => handleChange('additional_notes', e.target.value)}
                  placeholder="Any additional notes..."
                  className="mt-1 bg-white/5 border-white/10 text-white w-full text-sm"
                />
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="mt-4 sm:mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <GlassCard className="!p-3 sm:!p-6">
              <h3 className="font-heading text-base sm:text-lg text-white mb-3 sm:mb-4">Grantor / Settlor</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Name</Label>
                  <Input
                    value={form.grantor_name}
                    onChange={e => handleChange('grantor_name', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 h-9 sm:h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Address</Label>
                  <Textarea
                    value={form.grantor_address}
                    onChange={e => handleChange('grantor_address', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="!p-3 sm:!p-6">
              <h3 className="font-heading text-base sm:text-lg text-white mb-3 sm:mb-4">Trustee</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Name</Label>
                  <Input
                    value={form.trustee_name}
                    onChange={e => handleChange('trustee_name', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 h-9 sm:h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Address</Label>
                  <Textarea
                    value={form.trustee_address}
                    onChange={e => handleChange('trustee_address', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="!p-3 sm:!p-6">
              <h3 className="font-heading text-base sm:text-lg text-white mb-3 sm:mb-4">Co-Trustee (Optional)</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Name</Label>
                  <Input
                    value={form.co_trustee_name}
                    onChange={e => handleChange('co_trustee_name', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 h-9 sm:h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Address</Label>
                  <Textarea
                    value={form.co_trustee_address}
                    onChange={e => handleChange('co_trustee_address', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="!p-3 sm:!p-6">
              <h3 className="font-heading text-base sm:text-lg text-white mb-3 sm:mb-4">Beneficiary</h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Name</Label>
                  <Input
                    value={form.beneficiary_name}
                    onChange={e => handleChange('beneficiary_name', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 h-9 sm:h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Address</Label>
                  <Textarea
                    value={form.beneficiary_address}
                    onChange={e => handleChange('beneficiary_address', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* RM-ID System Tab */}
        <TabsContent value="rm-id" className="mt-4 sm:mt-6">
          <GlassCard className="!p-3 sm:!p-6">
            <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Envelope className="w-5 h-5 sm:w-6 sm:h-6 text-vault-gold flex-shrink-0" weight="duotone" />
              <div>
                <h3 className="font-heading text-base sm:text-lg text-white">Registered Envelope ID System</h3>
                <p className="text-white/50 text-xs sm:text-sm">
                  Internal recordkeeping ID using registered mail sticker numbers.
                </p>
              </div>
            </div>

            {/* Placeholder Warning */}
            {form.rm_id_is_placeholder && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-xs sm:text-sm font-medium">⚠️ Placeholder RM-ID</p>
                <p className="text-white/60 text-xs sm:text-sm mt-1">
                  This is a temporary placeholder. Replace with your actual registered mail sticker number when available.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-white/60 text-xs sm:text-sm">Main RM-ID (User Entered)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Question className="w-3 h-3 text-white/30" weight="duotone" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-vault-navy border-white/10 max-w-xs">
                        <p className="text-sm">Enter the registered mail sticker number from your physical sticker/receipt (e.g., RF 123 456 789 US). This becomes the base for all sub-record IDs.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={form.rm_id_raw}
                    onChange={e => handleChange('rm_id_raw', e.target.value)}
                    placeholder="e.g., RF 123 456 789 US"
                    className="flex-1 bg-white/5 border-white/10 font-mono text-sm sm:text-lg h-9 sm:h-10"
                  />
                  <Button 
                    variant="outline" 
                    onClick={generatePlaceholderRmId}
                    disabled={generatingPlaceholder}
                    className="btn-secondary whitespace-nowrap h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    {generatingPlaceholder ? 'Generating...' : 'Generate Placeholder'}
                  </Button>
                </div>
                <p className="text-white/30 text-xs mt-1">
                  This is your internal recordkeeping ID from your registered mail sticker
                </p>
              </div>

              {form.rm_id_normalized && (
                <div className="p-3 bg-vault-gold/10 rounded-lg">
                  <Label className="text-white/40 text-[10px] sm:text-xs uppercase">Normalized ID (Used for Sub-Records)</Label>
                  <p className="text-vault-gold font-mono text-sm sm:text-lg break-all">{form.rm_id_normalized}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Series Start</Label>
                  <Input
                    value={form.rm_series_start}
                    onChange={e => handleChange('rm_series_start', e.target.value)}
                    placeholder="01.001"
                    className="mt-1 bg-white/5 border-white/10 font-mono h-9 sm:h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-white/60 text-xs sm:text-sm">Series End</Label>
                  <Input
                    value={form.rm_series_end}
                    onChange={e => handleChange('rm_series_end', e.target.value)}
                    placeholder="99.999"
                    className="mt-1 bg-white/5 border-white/10 font-mono h-9 sm:h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white/60 text-xs sm:text-sm">Evidence Files</Label>
                <div className="mt-2 border-2 border-dashed border-white/10 rounded-lg p-4 sm:p-6 text-center hover:border-vault-gold/30 transition-colors cursor-pointer">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-white/30 mx-auto mb-2" weight="duotone" />
                  <p className="text-white/40 text-xs sm:text-sm">Upload sticker photo or receipt</p>
                  <p className="text-white/20 text-[10px] sm:text-xs">Click or drag files here</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Tax IDs Tab */}
        <TabsContent value="tax-ids" className="mt-4 sm:mt-6">
          <GlassCard className="!p-3 sm:!p-6">
            <h3 className="font-heading text-base sm:text-lg text-white mb-3 sm:mb-4">Tax Identifiers</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              <div>
                <Label className="text-white/60 text-xs sm:text-sm">Trust EIN (Optional)</Label>
                <Input
                  value={form.trust_ein}
                  onChange={e => handleChange('trust_ein', e.target.value)}
                  placeholder="XX-XXXXXXX"
                  className="mt-1 bg-white/5 border-white/10 font-mono h-9 sm:h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs sm:text-sm">Estate EIN (Optional)</Label>
                <Input
                  value={form.estate_ein}
                  onChange={e => handleChange('estate_ein', e.target.value)}
                  placeholder="XX-XXXXXXX"
                  className="mt-1 bg-white/5 border-white/10 font-mono h-9 sm:h-10 text-sm"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-white/60 text-xs sm:text-sm">Classification</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Question className="w-3 h-3 text-white/30" weight="duotone" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-vault-navy border-white/10 max-w-xs">
                        <p className="text-sm">Domestic vs Foreign trust classification depends on the court test and control test under IRC §7701(a)(30). This is fact-dependent—consult qualified tax counsel.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <select
                  value={form.tax_classification}
                  onChange={e => handleChange('tax_classification', e.target.value)}
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-md p-2 text-white h-9 sm:h-10 text-sm"
                >
                  <option value="" className="bg-vault-navy">Select...</option>
                  <option value="domestic" className="bg-vault-navy">Domestic Trust</option>
                  <option value="foreign" className="bg-vault-navy">Foreign Trust</option>
                  <option value="undetermined" className="bg-vault-navy">Undetermined / Consult Counsel</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/60 text-xs sm:text-sm">Tax Notes</Label>
                <Textarea
                  value={form.tax_notes}
                  onChange={e => handleChange('tax_notes', e.target.value)}
                  placeholder="Your notes about tax classification..."
                  className="mt-1 bg-white/5 border-white/10 text-sm"
                  rows={3}
                />
                <p className="text-white/30 text-[10px] sm:text-xs mt-1">User-entered notes for reference</p>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Envelope Log Tab */}
        <TabsContent value="mail-log" className="mt-4 sm:mt-6">
          <GlassCard className="!p-3 sm:!p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-heading text-base sm:text-lg text-white">Envelope Event Log</h3>
              <Button className="btn-secondary h-8 sm:h-10 text-xs sm:text-sm px-2 sm:px-4" disabled={!profile}>
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" weight="duotone" /> Log Event
              </Button>
            </div>

            {!profile && (
              <p className="text-white/40 text-xs sm:text-sm">Save the trust profile first to enable mail event logging.</p>
            )}

            {profile && mailEvents.length === 0 && (
              <p className="text-white/40 text-xs sm:text-sm">No mail events logged yet.</p>
            )}

            {mailEvents.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                {mailEvents.map(event => (
                  <div key={event.event_id} className="p-3 sm:p-4 bg-white/5 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium text-sm sm:text-base">{event.purpose}</p>
                        <p className="text-white/40 text-xs sm:text-sm">
                          {event.event_type} • {event.date}
                        </p>
                        <MonoChip variant="muted" size="xs" className="mt-1">{event.rm_id}</MonoChip>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        event.event_type === 'received' ? 'bg-green-500/20 text-green-400' :
                        event.event_type === 'sent' ? 'bg-vault-blue/20 text-vault-blue' :
                        'bg-white/10 text-white/50'
                      }`}>
                        {event.event_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
