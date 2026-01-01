/**
 * Bates Schemes Settings Component
 * 
 * Manages Bates numbering prefix schemes and continuation tracking.
 * Features:
 * - CRUD for prefix schemes (templates)
 * - Continuation tracking (remembers last used number)
 * - Quick apply scheme to current binder settings
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '../../lib/api';
import {
  Stamp,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  CheckCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

// Position options for Bates stamps
const POSITION_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
];

// Default scheme template
const DEFAULT_SCHEME = {
  name: '',
  prefix_pattern: '',
  digits: 6,
  position: 'bottom-right',
  include_cover: false,
  is_default: false,
};

export default function BatesSchemesSettings({ 
  workspaceId, 
  portfolioId,
  onApplyScheme,
  compact = false 
}) {
  const [schemes, setSchemes] = useState([]);
  const [continuations, setContinuations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);
  
  // Dialog states
  const [showSchemeDialog, setShowSchemeDialog] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch schemes
  const fetchSchemes = useCallback(async () => {
    if (!workspaceId) return;
    
    try {
      const response = await api.get('/api/bates/schemes', {
        headers: { 'X-Workspace-ID': workspaceId }
      });
      
      if (response.data.success) {
        setSchemes(response.data.data.schemes || []);
      }
    } catch (error) {
      console.error('Error fetching schemes:', error);
      // Don't show error toast for 404 (no schemes yet)
      if (error.response?.status !== 404) {
        toast.error('Failed to load Bates schemes');
      }
    }
  }, [workspaceId]);

  // Fetch continuations
  const fetchContinuations = useCallback(async () => {
    if (!workspaceId) return;
    
    try {
      const response = await api.get('/api/bates/continuations', {
        headers: { 'X-Workspace-ID': workspaceId },
        params: portfolioId ? { portfolio_id: portfolioId } : {}
      });
      
      if (response.data.success) {
        setContinuations(response.data.data.continuations || []);
      }
    } catch (error) {
      console.error('Error fetching continuations:', error);
    }
  }, [workspaceId, portfolioId]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSchemes(), fetchContinuations()]);
      setLoading(false);
    };
    loadData();
  }, [fetchSchemes, fetchContinuations]);

  // Save scheme
  const handleSaveScheme = async (schemeData) => {
    setSaving(true);
    try {
      if (editingScheme?.scheme_id) {
        // Update existing
        await api.put(`/api/bates/schemes/${editingScheme.scheme_id}`, schemeData, {
          headers: { 'X-Workspace-ID': workspaceId }
        });
        toast.success('Scheme updated');
      } else {
        // Create new
        await api.post('/api/bates/schemes', schemeData, {
          headers: { 'X-Workspace-ID': workspaceId }
        });
        toast.success('Scheme created');
      }
      
      setShowSchemeDialog(false);
      setEditingScheme(null);
      await fetchSchemes();
    } catch (error) {
      toast.error(error.response?.data?.detail?.message || 'Failed to save scheme');
    } finally {
      setSaving(false);
    }
  };

  // Delete scheme
  const handleDeleteScheme = async () => {
    if (!deleteTarget?.scheme_id) return;
    
    try {
      await api.delete(`/api/bates/schemes/${deleteTarget.scheme_id}`, {
        headers: { 'X-Workspace-ID': workspaceId }
      });
      toast.success('Scheme deleted');
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      await fetchSchemes();
    } catch (error) {
      toast.error(error.response?.data?.detail?.message || 'Failed to delete scheme');
    }
  };

  // Apply scheme to current settings
  const handleApplyScheme = (scheme) => {
    if (onApplyScheme) {
      // Find continuation for this prefix
      const continuation = continuations.find(c => 
        c.prefix.toUpperCase() === scheme.prefix_pattern.toUpperCase()
      );
      
      onApplyScheme({
        bates_prefix: scheme.prefix_pattern,
        bates_digits: scheme.digits,
        bates_position: scheme.position,
        bates_start_number: continuation ? continuation.last_number + 1 : 1,
        bates_include_cover: scheme.include_cover || false,
      });
      
      toast.success(`Applied "${scheme.name}" scheme`);
    }
  };

  // Get continuation for a prefix
  const getContinuation = (prefix) => {
    return continuations.find(c => c.prefix.toUpperCase() === prefix.toUpperCase());
  };

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-vault-gold/10 border border-vault-gold/20 hover:bg-vault-gold/20 transition-colors w-full"
      >
        <Settings className="w-4 h-4 text-vault-gold" />
        <span className="text-sm text-vault-gold">Manage Bates Schemes</span>
        <ChevronDown className="w-4 h-4 text-vault-gold ml-auto" />
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stamp className="w-4 h-4 text-vault-gold" />
          <span className="text-white text-sm font-medium">Bates Schemes</span>
          {schemes.length > 0 && (
            <Badge variant="outline" className="bg-vault-gold/10 text-vault-gold border-vault-gold/30 text-xs">
              {schemes.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { setEditingScheme(null); setShowSchemeDialog(true); }}
            size="sm"
            variant="outline"
            className="border-vault-gold/30 text-vault-gold hover:bg-vault-gold/10 h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
          {compact && (
            <button onClick={() => setExpanded(false)} className="p-1 hover:bg-white/10 rounded">
              <ChevronUp className="w-4 h-4 text-vault-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-vault-gold" />
        </div>
      ) : schemes.length === 0 ? (
        <div className="text-center py-4 text-vault-muted text-sm">
          No saved schemes. Create one to save time on future binders.
        </div>
      ) : (
        <div className="space-y-2">
          {schemes.map((scheme) => {
            const continuation = getContinuation(scheme.prefix_pattern);
            
            return (
              <div
                key={scheme.scheme_id}
                className="p-3 rounded-lg bg-[#0B1221] border border-vault-gold/10 hover:border-vault-gold/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{scheme.name}</span>
                      {scheme.is_default && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-vault-gold font-mono text-xs">
                        {scheme.prefix_pattern}
                        {String(continuation?.last_number + 1 || 1).padStart(scheme.digits, '0')}
                      </span>
                      {continuation && (
                        <span className="text-vault-muted text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last: {continuation.last_number}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {onApplyScheme && (
                      <Button
                        onClick={() => handleApplyScheme(scheme)}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-vault-gold hover:bg-vault-gold/10"
                      >
                        Apply
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    <Button
                      onClick={() => { setEditingScheme(scheme); setShowSchemeDialog(true); }}
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => { setDeleteTarget(scheme); setShowDeleteConfirm(true); }}
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Continuations Summary */}
      {continuations.length > 0 && (
        <div className="pt-2 border-t border-vault-gold/10">
          <p className="text-xs text-vault-muted mb-2">Recent Continuations:</p>
          <div className="flex flex-wrap gap-1">
            {continuations.slice(0, 5).map((cont) => (
              <Badge
                key={cont.prefix}
                variant="outline"
                className="bg-white/5 text-white/60 border-white/10 text-xs font-mono"
              >
                {cont.prefix}{cont.last_number}
              </Badge>
            ))}
            {continuations.length > 5 && (
              <Badge variant="outline" className="bg-white/5 text-white/40 border-white/10 text-xs">
                +{continuations.length - 5} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Scheme Dialog */}
      <SchemeDialog
        open={showSchemeDialog}
        onClose={() => { setShowSchemeDialog(false); setEditingScheme(null); }}
        scheme={editingScheme}
        onSave={handleSaveScheme}
        saving={saving}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-vault-dark border-vault-gold/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-vault-light">Delete Scheme</AlertDialogTitle>
            <AlertDialogDescription className="text-vault-muted">
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? 
              This won&apos;t affect previously generated binders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-vault-navy border-vault-gold/20">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScheme} className="bg-red-500/20 text-red-400 hover:bg-red-500/30">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Scheme Dialog Component
function SchemeDialog({ open, onClose, scheme, onSave, saving }) {
  const [formData, setFormData] = useState(DEFAULT_SCHEME);

  // Reset form when dialog opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) {
      setFormData(scheme ? {
        name: scheme.name || '',
        prefix_pattern: scheme.prefix_pattern || '',
        digits: scheme.digits || 6,
        position: scheme.position || 'bottom-right',
        include_cover: scheme.include_cover || false,
        is_default: scheme.is_default || false,
      } : DEFAULT_SCHEME);
    }
  }, [open, scheme?.scheme_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.prefix_pattern.trim()) {
      toast.error('Name and prefix template are required');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-vault-dark border-vault-gold/20 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-vault-light">
            {scheme ? 'Edit Scheme' : 'New Bates Scheme'}
          </DialogTitle>
          <DialogDescription className="text-vault-muted">
            {scheme ? 'Update the scheme settings.' : 'Create a reusable Bates numbering template.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-vault-muted">Scheme Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Discovery - Doe v Smith"
              className="bg-vault-navy border-vault-gold/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-vault-muted">Prefix Template</Label>
            <Input
              value={formData.prefix_pattern}
              onChange={(e) => setFormData({ ...formData, prefix_pattern: e.target.value.toUpperCase() })}
              placeholder="e.g., DOE-DISC-"
              className="bg-vault-navy border-vault-gold/20 font-mono"
            />
            <p className="text-xs text-vault-muted">Numbers will be appended to this prefix.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-vault-muted">Digits</Label>
              <Select
                value={String(formData.default_digits)}
                onValueChange={(v) => setFormData({ ...formData, default_digits: parseInt(v) })}
              >
                <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-vault-dark border-vault-gold/20">
                  {[4, 5, 6, 7, 8].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} digits</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-vault-muted">Position</Label>
              <Select
                value={formData.default_position}
                onValueChange={(v) => setFormData({ ...formData, default_position: v })}
              >
                <SelectTrigger className="bg-vault-navy border-vault-gold/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-vault-dark border-vault-gold/20">
                  {POSITION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <Label className="text-vault-muted">Set as Default</Label>
            <Switch
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
            />
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-vault-gold/10 border border-vault-gold/20">
            <p className="text-xs text-vault-muted mb-1">Preview:</p>
            <span className="text-vault-gold font-mono text-sm">
              {formData.prefix_template || 'DOC-'}
              {String(1).padStart(formData.default_digits, '0')}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-vault-gold/20">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-vault-gold/20 text-vault-gold hover:bg-vault-gold/30"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {scheme ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
