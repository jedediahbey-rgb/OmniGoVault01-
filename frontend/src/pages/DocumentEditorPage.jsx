import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Save, 
  Download, 
  ArrowLeft,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Undo,
  Redo,
  FileText,
  Clock,
  Check,
  Lock,
  Unlock,
  Eye,
  Edit3,
  CheckCircle,
  AlertCircle,
  Hash,
  Printer
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import GlassCard from '../components/shared/GlassCard';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import { toast } from 'sonner';

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
        title="Undo"
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={disabled || !editor.can().redo()}
        title="Redo"
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        disabled={disabled}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        disabled={disabled}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={disabled}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={disabled}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        disabled={disabled}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        disabled={disabled}
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
};

// Document View Component (for finalized documents)
const DocumentView = ({ document, content }) => {
  return (
    <div className="bg-white text-black rounded-lg shadow-2xl max-w-4xl mx-auto overflow-hidden">
      {/* Document Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 border-b-4 border-vault-gold">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-serif mb-1">{document.title}</h1>
            <p className="text-white/60 text-sm">{document.document_type?.replace(/_/g, ' ').toUpperCase()}</p>
          </div>
          {document.sub_record_id && (
            <div className="text-right">
              <p className="text-white/40 text-xs uppercase">Document ID</p>
              <p className="text-vault-gold font-mono">{document.sub_record_id}</p>
            </div>
          )}
        </div>
      </div>

      {/* Document Seal/Badge */}
      {document.is_locked && (
        <div className="flex justify-center -mt-6 relative z-10">
          <div className="bg-green-600 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">FINALIZED DOCUMENT</span>
          </div>
        </div>
      )}

      {/* Document Content */}
      <div className="p-8 md:p-12">
        <div 
          className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-slate-800 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      {/* Document Footer */}
      <div className="bg-slate-50 p-6 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div>
            <p>Created: {new Date(document.created_at).toLocaleDateString()}</p>
            {document.locked_at && (
              <p>Finalized: {new Date(document.locked_at).toLocaleDateString()}</p>
            )}
          </div>
          {document.rm_id && (
            <div className="text-right">
              <p className="text-slate-400 text-xs">Trust RM-ID</p>
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
        class: 'prose prose-invert prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6',
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
    // Save first if there are changes
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-vault-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-4 p-4 border-b border-white/10"
      >
        <button
          onClick={() => navigate('/vault/documents')}
          className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            document?.is_locked ? 'bg-green-500/20' : 'bg-vault-gold/10'
          }`}>
            {document?.is_locked ? (
              <Lock className="w-5 h-5 text-green-400" />
            ) : (
              <FileText className="w-5 h-5 text-vault-gold" />
            )}
          </div>
          
          {document?.is_locked ? (
            <div>
              <h2 className="text-white font-heading">{title}</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Finalized
                </span>
                {document.sub_record_id && (
                  <span className="text-vault-gold/60 font-mono">{document.sub_record_id}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                className="bg-transparent border-none text-xl font-heading text-white p-0 h-auto focus-visible:ring-0"
                placeholder="Document Title"
              />
              {document?.sub_record_id && (
                <span className="text-vault-gold/60 text-sm font-mono">{document.sub_record_id}</span>
              )}
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {lastSaved && !document?.is_locked && (
            <span className="text-white/30 text-sm flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {hasChanges && !document?.is_locked && (
            <span className="text-vault-gold text-sm">Unsaved changes</span>
          )}
        </div>

        {/* View Toggle (for non-locked documents) */}
        {!document?.is_locked && (
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                viewMode === 'edit' ? 'bg-vault-gold/20 text-vault-gold' : 'text-white/50 hover:text-white'
              }`}
            >
              <Edit3 className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${
                viewMode === 'preview' ? 'bg-vault-gold/20 text-vault-gold' : 'text-white/50 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {document?.is_locked ? (
            <>
              <Button onClick={() => setShowUnlockDialog(true)} variant="outline" className="btn-secondary">
                <Unlock className="w-4 h-4 mr-2" />
                Unlock to Edit
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="btn-secondary">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={printDocument} className="btn-primary">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </>
          ) : (
            <>
              <Button onClick={saveDocument} disabled={saving || !hasChanges} variant="outline" className="btn-secondary">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button onClick={exportToPDF} variant="outline" className="btn-secondary">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setShowFinalizeDialog(true)} className="btn-primary">
                <Lock className="w-4 h-4 mr-2" />
                Finalize
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Editor or Preview Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {viewMode === 'edit' && !document?.is_locked ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto my-8"
            >
              <GlassCard className="overflow-hidden">
                <EditorToolbar editor={editor} disabled={document?.is_locked} />
                <EditorContent editor={editor} />
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 px-4"
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
              <Lock className="w-5 h-5 text-vault-gold" />
              Finalize Document
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Finalizing this document will lock it for editing. It will be marked as a final, official version.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
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
              <CheckCircle className="w-4 h-4 mr-2" />
              Finalize Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Confirmation Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <Unlock className="w-5 h-5 text-vault-gold" />
              Unlock Document
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Unlocking this document will allow you to edit it again. The document will return to draft status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUnlockDialog(false)}>Cancel</Button>
            <Button onClick={unlockDocument} className="btn-primary">
              <Unlock className="w-4 h-4 mr-2" />
              Unlock for Editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
