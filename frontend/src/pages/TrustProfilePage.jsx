import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft, Save, Mail, FileText, Plus, Upload, Clock, HelpCircle
} from 'lucide-react';
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
        Promise.resolve({ data: [] }) // Mail events will be fetched if profile exists
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(`/vault/portfolio/${portfolioId}`)}
        className="flex items-center gap-2 text-white/40 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Portfolio
      </button>

      <PageHeader
        icon={FileText}
        title={profile ? 'Edit Trust Profile' : 'Create Trust Profile'}
        subtitle="Configure trust details, RM-ID tracking, and tax identifiers"
        actions={
          <Button onClick={saveProfile} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="bg-white/5 border border-white/10 p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            General
          </TabsTrigger>
          <TabsTrigger value="parties" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            Parties
          </TabsTrigger>
          <TabsTrigger value="rm-id" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            RM-ID System
          </TabsTrigger>
          <TabsTrigger value="tax-ids" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            Tax IDs
          </TabsTrigger>
          <TabsTrigger value="mail-log" className="data-[state=active]:bg-vault-gold/20 data-[state=active]:text-vault-gold">
            Mail Log
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6">
          <GlassCard>
            <h3 className="font-heading text-lg text-white mb-6">Trust Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-white/60">Trust Name *</Label>
                <Input
                  value={form.trust_name}
                  onChange={e => handleChange('trust_name', e.target.value)}
                  placeholder="e.g., Smith Family Trust"
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label className="text-white/60">Trust Identifier</Label>
                <Input
                  value={form.trust_identifier}
                  onChange={e => handleChange('trust_identifier', e.target.value)}
                  placeholder="Internal reference"
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label className="text-white/60">Creation Date</Label>
                <Input
                  type="date"
                  value={form.creation_date}
                  onChange={e => handleChange('creation_date', e.target.value)}
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label className="text-white/60">Trust Term</Label>
                <Input
                  value={form.trust_term}
                  onChange={e => handleChange('trust_term', e.target.value)}
                  placeholder="e.g., 21 years, Perpetual"
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/60">Governing Statements</Label>
                <Textarea
                  value={form.governing_statements}
                  onChange={e => handleChange('governing_statements', e.target.value)}
                  placeholder="Key governing principles..."
                  className="mt-1 bg-white/5 border-white/10 min-h-[100px]"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/60">Additional Notes</Label>
                <Textarea
                  value={form.additional_notes}
                  onChange={e => handleChange('additional_notes', e.target.value)}
                  placeholder="Any additional notes..."
                  className="mt-1 bg-white/5 border-white/10"
                />
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="font-heading text-lg text-white mb-4">Grantor / Settlor</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-white/60">Name</Label>
                  <Input
                    value={form.grantor_name}
                    onChange={e => handleChange('grantor_name', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-white/60">Address</Label>
                  <Textarea
                    value={form.grantor_address}
                    onChange={e => handleChange('grantor_address', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10"
                    rows={2}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-heading text-lg text-white mb-4">Trustee</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-white/60">Name</Label>
                  <Input
                    value={form.trustee_name}
                    onChange={e => handleChange('trustee_name', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-white/60">Address</Label>
                  <Textarea
                    value={form.trustee_address}
                    onChange={e => handleChange('trustee_address', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10"
                    rows={2}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-heading text-lg text-white mb-4">Co-Trustee (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-white/60">Name</Label>
                  <Input
                    value={form.co_trustee_name}
                    onChange={e => handleChange('co_trustee_name', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-white/60">Address</Label>
                  <Textarea
                    value={form.co_trustee_address}
                    onChange={e => handleChange('co_trustee_address', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10"
                    rows={2}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-heading text-lg text-white mb-4">Beneficiary</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-white/60">Name</Label>
                  <Input
                    value={form.beneficiary_name}
                    onChange={e => handleChange('beneficiary_name', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-white/60">Address</Label>
                  <Textarea
                    value={form.beneficiary_address}
                    onChange={e => handleChange('beneficiary_address', e.target.value)}
                    className="mt-1 bg-white/5 border-white/10"
                    rows={2}
                  />
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* RM-ID System Tab */}
        <TabsContent value="rm-id" className="mt-6">
          <GlassCard>
            <div className="flex items-start gap-3 mb-6">
              <Mail className="w-6 h-6 text-vault-gold flex-shrink-0" />
              <div>
                <h3 className="font-heading text-lg text-white">Registered Mail ID System</h3>
                <p className="text-white/50 text-sm">
                  Internal recordkeeping identifier using registered mail sticker numbers.
                </p>
              </div>
            </div>

            {/* Placeholder Warning */}
            {form.rm_id_is_placeholder && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm font-medium">⚠️ Placeholder RM-ID</p>
                <p className="text-white/60 text-sm mt-1">
                  This is a temporary placeholder. Replace with your actual registered mail sticker number when available.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-white/60">Main RM-ID (User Entered)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3 h-3 text-white/30" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-vault-navy border-white/10 max-w-xs">
                        <p className="text-sm">Enter the registered mail sticker number from your physical sticker/receipt (e.g., RF 123 456 789 US). This becomes the base for all sub-record IDs.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={form.rm_id_raw}
                    onChange={e => handleChange('rm_id_raw', e.target.value)}
                    placeholder="e.g., RF 123 456 789 US"
                    className="flex-1 bg-white/5 border-white/10 font-mono text-lg"
                  />
                  <Button 
                    variant="outline" 
                    onClick={generatePlaceholderRmId}
                    disabled={generatingPlaceholder}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {generatingPlaceholder ? 'Generating...' : 'Generate Placeholder'}
                  </Button>
                </div>
                <p className="text-white/30 text-xs mt-1">
                  This is your internal recordkeeping ID from your registered mail sticker
                </p>
              </div>

              {form.rm_id_normalized && (
                <div className="md:col-span-2 p-3 bg-vault-gold/10 rounded-lg">
                  <Label className="text-white/40 text-xs uppercase">Normalized ID (Used for Sub-Records)</Label>
                  <p className="text-vault-gold font-mono text-lg">{form.rm_id_normalized}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/60">Series Start</Label>
                  <Input
                    value={form.rm_series_start}
                    onChange={e => handleChange('rm_series_start', e.target.value)}
                    placeholder="01.001"
                    className="mt-1 bg-white/5 border-white/10 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-white/60">Series End</Label>
                  <Input
                    value={form.rm_series_end}
                    onChange={e => handleChange('rm_series_end', e.target.value)}
                    placeholder="99.999"
                    className="mt-1 bg-white/5 border-white/10 font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Label className="text-white/60">Evidence Files</Label>
                <div className="mt-2 border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:border-vault-gold/30 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">Upload sticker photo or receipt</p>
                  <p className="text-white/20 text-xs">Click or drag files here</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Tax IDs Tab */}
        <TabsContent value="tax-ids" className="mt-6">
          <GlassCard>
            <h3 className="font-heading text-lg text-white mb-4">Tax Identifiers</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-white/60">Trust EIN (Optional)</Label>
                <Input
                  value={form.trust_ein}
                  onChange={e => handleChange('trust_ein', e.target.value)}
                  placeholder="XX-XXXXXXX"
                  className="mt-1 bg-white/5 border-white/10 font-mono"
                />
              </div>
              <div>
                <Label className="text-white/60">Estate EIN (Optional)</Label>
                <Input
                  value={form.estate_ein}
                  onChange={e => handleChange('estate_ein', e.target.value)}
                  placeholder="XX-XXXXXXX"
                  className="mt-1 bg-white/5 border-white/10 font-mono"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-white/60">Classification</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3 h-3 text-white/30" />
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
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-md p-2 text-white"
                >
                  <option value="" className="bg-vault-navy">Select...</option>
                  <option value="domestic" className="bg-vault-navy">Domestic Trust</option>
                  <option value="foreign" className="bg-vault-navy">Foreign Trust</option>
                  <option value="undetermined" className="bg-vault-navy">Undetermined / Consult Counsel</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/60">Tax Notes (Educational)</Label>
                <Textarea
                  value={form.tax_notes}
                  onChange={e => handleChange('tax_notes', e.target.value)}
                  placeholder="Your educational notes about tax classification..."
                  className="mt-1 bg-white/5 border-white/10"
                  rows={3}
                />
                <p className="text-white/30 text-xs mt-1">User-entered notes for educational reference only</p>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Mail Log Tab */}
        <TabsContent value="mail-log" className="mt-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg text-white">Mail Event Log</h3>
              <Button className="btn-secondary" disabled={!profile}>
                <Plus className="w-4 h-4 mr-2" /> Log Event
              </Button>
            </div>

            {!profile && (
              <p className="text-white/40">Save the trust profile first to enable mail event logging.</p>
            )}

            {profile && mailEvents.length === 0 && (
              <p className="text-white/40">No mail events logged yet.</p>
            )}

            {mailEvents.length > 0 && (
              <div className="space-y-3">
                {mailEvents.map(event => (
                  <div key={event.event_id} className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">{event.purpose}</p>
                        <p className="text-white/40 text-sm">
                          {event.event_type} • {event.date}
                        </p>
                        <p className="text-white/30 text-xs font-mono mt-1">{event.rm_id}</p>
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
