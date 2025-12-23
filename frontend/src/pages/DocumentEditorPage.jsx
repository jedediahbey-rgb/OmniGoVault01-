import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  FileText,
  Clock,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import GlassCard from '../components/shared/GlassCard';
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
const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b border-white/10 flex-wrap">
      {/* History */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-6 bg-white/10 mx-2" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
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
    if (!editor || saving) return;
    
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
  }, [editor, documentId, title, saving]);

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

  // Auto-save on Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument]);

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
          <div className="w-10 h-10 rounded-lg bg-vault-gold/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-vault-gold" />
          </div>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
            className="text-lg font-heading bg-transparent border-none focus:border-none focus:ring-0 p-0 text-white"
            placeholder="Document Title"
          />
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-white/30 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {hasChanges && (
            <span className="text-xs text-vault-gold">• Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={exportToPDF}
            variant="outline"
            className="btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            onClick={saveDocument}
            disabled={saving || !hasChanges}
            className="btn-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </motion.div>

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <EditorToolbar editor={editor} />
          
          {/* Editor */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-vault-paper/50">
            <div className="max-w-4xl mx-auto bg-white/[0.02] min-h-full border-x border-white/5">
              <EditorContent 
                editor={editor} 
                className="min-h-full"
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Document Info */}
        <div className="w-72 border-l border-white/10 p-4 hidden lg:block overflow-y-auto custom-scrollbar">
          <h3 className="font-heading text-white mb-4">Document Info</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Type</p>
              <p className="text-white text-sm">{document?.document_type}</p>
            </div>
            
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Status</p>
              <span className={`px-2 py-1 rounded text-xs ${
                document?.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                document?.status === 'signed' ? 'bg-vault-gold/20 text-vault-gold' :
                'bg-white/10 text-white/50'
              }`}>
                {document?.status}
              </span>
            </div>
            
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Created</p>
              <p className="text-white text-sm">
                {document?.created_at ? new Date(document.created_at).toLocaleDateString() : '-'}
              </p>
            </div>
            
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Version</p>
              <p className="text-white text-sm">v{document?.version || 1}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-white/60 text-sm mb-3">Keyboard Shortcuts</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Save</span>
                <span className="text-white/60 font-mono">Ctrl+S</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Bold</span>
                <span className="text-white/60 font-mono">Ctrl+B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Italic</span>
                <span className="text-white/60 font-mono">Ctrl+I</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Undo</span>
                <span className="text-white/60 font-mono">Ctrl+Z</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
