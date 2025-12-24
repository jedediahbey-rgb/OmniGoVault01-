import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowLeft,
  Check,
  CheckCircle,
  CircleNotch,
  Clock,
  Download,
  Eye,
  FileMagnifyingGlass,
  FileText,
  FloppyDisk,
  Hash,
  List,
  ListNumbers,
  Lock,
  LockOpen,
  MagicWand,
  PencilSimple,
  Printer,
  Sparkle,
  TextB,
  TextHOne,
  TextHTwo,
  TextItalic,
  WarningCircle
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import GlassCard from '../components/shared/GlassCard';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { humanizeSlug } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Toolbar Button Component
const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded transition-colors ${
      isActive 
        ? 'bg-vault-gold/20 text-vault-gold' 
        : 'text-white/50 hover:text-white hover:bg-white/10'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

// Editor Toolbar Component
const EditorToolbar = ({ editor, disabled }) => {
  if (!editor) return null;

  return (
    <div className={`flex items-center gap-1 p-2 border-b border-white/10 flex-wrap ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* History */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={disabled || !editor.can().undo()}
        title="ArrowCounterClockwise"
      >
        <ArrowCounterClockwise className="w-4 h-4" weight="duotone" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={disabled || !editor.can().redo()}
        title="ArrowClockwise"
      >
        <ArrowClockwise className="w-4 h-4" weight="duotone" />
      </ToolbarButton>

      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        disabled={disabled}
        title="Heading 1"
      >
        <TextHOne className="w-4 h-4" weight="duotone" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        disabled={disabled}
        title="Heading 2"
      >
        <TextHTwo className="w-4 h-4" weight="duotone" />
      </ToolbarButton>

      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={disabled}
        title="TextB"
      >
        <TextB className="w-4 h-4" weight="duotone" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={disabled}
        title="TextItalic"
      >
        <TextItalic className="w-4 h-4" weight="duotone" />
      </ToolbarButton>

      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        disabled={disabled}
        title="Bullet List"
      >
        <List className="w-4 h-4" weight="duotone" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        disabled={disabled}
        title="Numbered List"
      >
        <ListNumbers className="w-4 h-4" weight="duotone" />
      </ToolbarButton>
    </div>
  );
};

// Document View Component (for finalized documents)
const DocumentView = ({ document, content }) => {
  return (
    <div className="w-full max-w-none md:max-w-3xl mx-auto bg-white text-slate-900 shadow-2xl rounded-lg overflow-hidden">
      {/* Document Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-serif text-lg sm:text-xl md:text-2xl font-bold break-words">
              {document.title}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">{humanizeSlug(document.document_type)}</p>
          </div>
          {document.sub_record_id && (
            <div className="text-left sm:text-right shrink-0">
              <p className="text-slate-400 text-xs uppercase tracking-wider">RM-ID</p>
              <p className="text-amber-400 font-mono text-xs sm:text-sm break-all">{document.sub_record_id}</p>
            </div>
          )}
        </div>
      </div>

      {/* Document Seal/Badge */}
      {document.is_locked && (
        <div className="flex justify-center -mt-4 relative z-10">
          <div className="bg-green-600 text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full flex items-center gap-2 shadow-lg text-xs sm:text-sm">
            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" weight="duotone" />
            <span className="font-semibold">FINALIZED</span>
          </div>
        </div>
      )}

      {/* Document Content */}
      <div className="p-4 sm:p-6 md:p-8 lg:p-12">
        <div 
          className="prose prose-sm sm:prose-base md:prose-lg max-w-none prose-headings:font-serif prose-headings:text-slate-800 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      {/* Document Footer */}
      <div className="bg-slate-50 p-3 sm:p-4 md:p-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-slate-500">
          <div>
            <p>Created: {new Date(document.created_at).toLocaleDateString()}</p>
            {document.locked_at && (
              <p>Finalized: {new Date(document.locked_at).toLocaleDateString()}</p>
            )}
          </div>
          {document.rm_id && (
            <div className="md:text-right">
              <p className="text-slate-400 text-xs">Sub-Record ID</p>
              <p className="font-mono text-slate-600">{document.rm_id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function DocumentEditorPage({ user }) {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'preview'
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  
  // AI Tools State
  const [showAiUpdateDialog, setShowAiUpdateDialog] = useState(false);
  const [showAiSummaryDialog, setShowAiSummaryDialog] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: {
          depth: 100,
        },
      }),
      Placeholder.configure({
        placeholder: 'Start typing your document...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base md:prose-lg max-w-none focus:outline-none min-h-[300px] sm:min-h-[400px] md:min-h-[500px] px-3 sm:px-6 md:px-8 py-4 sm:py-6 text-base leading-relaxed',
      },
    },
    onUpdate: () => {
      setHasChanges(true);
    },
  });

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId]);

  useEffect(() => {
    if (editor && document?.content) {
      editor.commands.setContent(document.content);
      setHasChanges(false);
      // Set editor editability based on document lock status
      editor.setEditable(!document.is_locked);
      // Auto-switch to preview mode if document is finalized
      if (document.is_locked) {
        setViewMode('preview');
      }
    }
  }, [editor, document]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`${API}/documents/${documentId}`);
      setDocument(response.data);
      setTitle(response.data.title);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      toast.error('Failed to load document');
      navigate('/vault/documents');
    } finally {
      setLoading(false);
    }
  };

  const saveDocument = useCallback(async () => {
    if (!editor || saving || document?.is_locked) return;
    
    setSaving(true);
    try {
      const content = editor.getHTML();
      await axios.put(`${API}/documents/${documentId}`, {
        title,
        content
      });
      setLastSaved(new Date());
      setHasChanges(false);
      toast.success('Document saved');
    } catch (error) {
      console.error('Failed to save document:', error);
      toast.error('Failed to save document');
    } finally {
      setSaving(false);
    }
  }, [editor, documentId, title, saving, document?.is_locked]);

  const finalizeDocument = async () => {
    // FloppyDisk first if there are changes
    if (hasChanges && editor) {
      await saveDocument();
    }
    
    try {
      await axios.post(`${API}/documents/${documentId}/finalize`);
      setDocument({ ...document, is_locked: true, status: 'final', locked_at: new Date().toISOString() });
      setViewMode('preview');
      if (editor) {
        editor.setEditable(false);
      }
      setShowFinalizeDialog(false);
      toast.success('Document finalized and locked');
    } catch (error) {
      console.error('Failed to finalize document:', error);
      toast.error('Failed to finalize document');
    }
  };

  const unlockDocument = async () => {
    try {
      await axios.post(`${API}/documents/${documentId}/unlock`);
      setDocument({ ...document, is_locked: false, status: 'draft', locked_at: null });
      setViewMode('edit');
      if (editor) {
        editor.setEditable(true);
      }
      setShowUnlockDialog(false);
      toast.success('Document unlocked for editing');
    } catch (error) {
      console.error('Failed to unlock document:', error);
      toast.error('Failed to unlock document');
    }
  };

  const exportToPDF = async () => {
    try {
      const response = await axios.get(`${API}/documents/${documentId}/export/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Document exported');
    } catch (error) {
      console.error('Failed to export document:', error);
      toast.error('Failed to export document');
    }
  };

  const printDocument = () => {
    window.print();
  };

  // Auto-save on Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!document?.is_locked) {
          saveDocument();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument, document?.is_locked]);

  // AI Tools Functions
  const aiUpdateDocument = async () => {
    if (!aiInstructions.trim()) {
      toast.error('Please provide instructions for the AI');
      return;
    }
    setAiProcessing(true);
    try {
      const response = await axios.post(`${API}/assistant/update-document`, {
        document_id: documentId,
        instructions: aiInstructions
      });
      toast.success('Document updated by AI');
      // Refresh the document
      await fetchDocument();
      setShowAiUpdateDialog(false);
      setAiInstructions('');
    } catch (error) {
      console.error('AI update error:', error);
      toast.error(error.response?.data?.detail || 'AI update failed');
    } finally {
      setAiProcessing(false);
    }
  };

  const aiSummarizeDocument = async () => {
    setAiProcessing(true);
    setAiSummary('');
    try {
      const response = await axios.post(`${API}/assistant/summarize-document?document_id=${documentId}`);
      setAiSummary(response.data.summary);
      setShowAiSummaryDialog(true);
    } catch (error) {
      console.error('AI summarize error:', error);
      toast.error(error.response?.data?.detail || 'AI summarization failed');
    } finally {
      setAiProcessing(false);
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
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="shrink-0 flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border-b border-white/10"
      >
        <button
          onClick={() => navigate('/vault/documents')}
          className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" weight="duotone" />
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-4">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
            document?.is_locked ? 'bg-green-500/20' : 'bg-vault-gold/10'
          }`}>
            {document?.is_locked ? (
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" weight="duotone" />
            ) : (
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-vault-gold" weight="duotone" />
            )}
          </div>
          
          {document?.is_locked ? (
            <div className="min-w-0">
              <h2 className="text-white font-heading text-sm sm:text-base truncate">{title}</h2>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" weight="duotone" /> <span className="hidden sm:inline">Finalized</span>
                </span>
                {document.sub_record_id && (
                  <span className="text-vault-gold/60 font-mono text-xs truncate max-w-[100px] sm:max-w-none">{document.sub_record_id}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                className="bg-transparent border-none text-base sm:text-xl font-heading text-white p-0 h-auto focus-visible:ring-0"
                placeholder="Document Title"
              />
              {document?.sub_record_id && (
                <span className="text-vault-gold/60 text-xs font-mono truncate block max-w-[150px] sm:max-w-none">{document.sub_record_id}</span>
              )}
            </div>
          )}
        </div>

        {/* Status Indicator - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {lastSaved && !document?.is_locked && (
            <span className="text-white/30 text-sm flex items-center gap-1">
              <Clock className="w-3 h-3" weight="duotone" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {hasChanges && !document?.is_locked && (
            <span className="text-vault-gold text-sm">Unsaved changes</span>
          )}
        </div>

        {/* View Toggle - hidden on small mobile */}
        {!document?.is_locked && (
          <div className="hidden sm:flex border border-white/10 rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                viewMode === 'edit' ? 'bg-vault-gold/20 text-vault-gold' : 'text-white/50 hover:text-white'
              }`}
            >
              <PencilSimple className="w-4 h-4" weight="duotone" /> Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                viewMode === 'preview' ? 'bg-vault-gold/20 text-vault-gold' : 'text-white/50 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" weight="duotone" /> Preview
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {document?.is_locked ? (
            <>
              <Button onClick={() => setShowUnlockDialog(true)} variant="outline" className="btn-secondary text-xs sm:text-sm px-2 sm:px-4">
                <LockOpen className="w-4 h-4 sm:mr-2" weight="duotone" />
                <span className="hidden sm:inline">LockOpen</span>
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="btn-secondary text-xs sm:text-sm px-2 sm:px-4">
                <Download className="w-4 h-4 sm:mr-2" weight="duotone" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button onClick={printDocument} className="btn-primary text-xs sm:text-sm px-2 sm:px-4">
                <Printer className="w-4 h-4 sm:mr-2" weight="duotone" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </>
          ) : (
            <>
              {/* AI Tools Dropdown - hidden on small mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="hidden sm:flex btn-secondary">
                    <Sparkle className="w-4 h-4 mr-2" weight="duotone" />
                    AI Tools
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-vault-navy border-white/10">
                  <DropdownMenuItem 
                    onClick={() => setShowAiUpdateDialog(true)}
                    className="text-white hover:bg-white/10 cursor-pointer"
                  >
                    <MagicWand className="w-4 h-4 mr-2" weight="duotone" />
                    Update with AI
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={aiSummarizeDocument}
                    disabled={aiProcessing}
                    className="text-white hover:bg-white/10 cursor-pointer"
                  >
                    <FileMagnifyingGlass className="w-4 h-4 mr-2" weight="duotone" />
                    {aiProcessing ? 'Summarizing...' : 'Summarize Document'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={saveDocument} disabled={saving || !hasChanges} variant="outline" className="btn-secondary text-xs sm:text-sm px-2 sm:px-4">
                <FloppyDisk className="w-4 h-4 sm:mr-2" weight="duotone" />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'FloppyDisk'}</span>
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="hidden sm:flex btn-secondary">
                <Download className="w-4 h-4 mr-2" weight="duotone" />
                Export
              </Button>
              <Button onClick={() => setShowFinalizeDialog(true)} className="btn-primary text-xs sm:text-sm px-2 sm:px-4">
                <Lock className="w-4 h-4 sm:mr-2" weight="duotone" />
                <span className="hidden sm:inline">Finalize</span>
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Editor or Preview Area */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <AnimatePresence mode="wait">
          {viewMode === 'edit' && !document?.is_locked ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-none md:max-w-4xl mx-auto px-3 py-4 md:px-8 md:py-8"
            >
              <GlassCard className="overflow-hidden">
                <EditorToolbar editor={editor} disabled={document?.is_locked} />
                <div className="prose prose-invert max-w-none w-full">
                  <EditorContent editor={editor} className="min-h-[50vh]" />
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-none px-3 py-4 md:px-8 md:py-8"
            >
              <DocumentView 
                document={document} 
                content={editor?.getHTML() || document?.content || ''} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Finalize Confirmation Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <Lock className="w-5 h-5 text-vault-gold" weight="duotone" />
              Finalize Document
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Finalizing this document will lock it for editing. It will be marked as a final, official version.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <WarningCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" weight="duotone" />
                <div className="text-sm">
                  <p className="text-yellow-400 font-medium mb-1">Before finalizing:</p>
                  <ul className="text-white/60 space-y-1 list-disc list-inside">
                    <li>Review the document carefully for accuracy</li>
                    <li>Ensure all fields are properly filled in</li>
                    <li>You can unlock later if changes are needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowFinalizeDialog(false)}>Cancel</Button>
            <Button onClick={finalizeDocument} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" weight="duotone" />
              Finalize Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LockOpen Confirmation Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <LockOpen className="w-5 h-5 text-vault-gold" weight="duotone" />
              LockOpen Document
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Unlocking this document will allow you to edit it again. The document will return to draft status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUnlockDialog(false)}>Cancel</Button>
            <Button onClick={unlockDocument} className="btn-primary">
              <LockOpen className="w-4 h-4 mr-2" weight="duotone" />
              LockOpen for Editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Update Document Dialog */}
      <Dialog open={showAiUpdateDialog} onOpenChange={setShowAiUpdateDialog}>
        <DialogContent className="bg-vault-navy border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <MagicWand className="w-5 h-5 text-vault-gold" weight="duotone" />
              Update with AI
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Describe the changes you want the AI to make to this document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="e.g., Add a signature block at the end, Fix the date format, Make the language more formal..."
              className="bg-white/5 border-white/10 min-h-[120px]"
            />
            <p className="text-white/30 text-xs mt-2">
              The AI will modify the document based on your instructions while preserving its structure.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowAiUpdateDialog(false); setAiInstructions(''); }}>
              Cancel
            </Button>
            <Button onClick={aiUpdateDocument} disabled={aiProcessing || !aiInstructions.trim()} className="btn-primary">
              {aiProcessing ? (
                <>
                  <CircleNotch className="w-4 h-4 mr-2 animate-spin" weight="duotone" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkle className="w-4 h-4 mr-2" weight="duotone" />
                  Apply Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Summary Dialog */}
      <Dialog open={showAiSummaryDialog} onOpenChange={setShowAiSummaryDialog}>
        <DialogContent className="bg-vault-navy border-white/10 max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <FileMagnifyingGlass className="w-5 h-5 text-vault-gold" weight="duotone" />
              Document Summary
            </DialogTitle>
            <DialogDescription className="text-white/60">
              AI-generated analysis of this document
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {aiSummary ? (
              <div className="prose prose-invert prose-sm max-w-none bg-white/5 p-4 rounded-lg">
                <div className="whitespace-pre-wrap text-white/80">{aiSummary}</div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <CircleNotch className="w-6 h-6 text-vault-gold animate-spin" weight="duotone" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAiSummaryDialog(false)} className="btn-primary">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
