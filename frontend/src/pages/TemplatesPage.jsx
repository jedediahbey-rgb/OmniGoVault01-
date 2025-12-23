import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  FileText, 
  Scroll, 
  CheckCircle, 
  Bell, 
  Package,
  Stamp,
  Scale,
  ArrowRight,
  Plus
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import GlassCard from '../components/shared/GlassCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { staggerContainer, fadeInUp } from '../lib/motion';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  scroll: Scroll,
  'file-signature': FileText,
  'check-circle': CheckCircle,
  bell: Bell,
  package: Package,
  stamp: Stamp,
  scale: Scale
};

export default function TemplatesPage({ user }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, portfoliosRes] = await Promise.all([
        axios.get(`${API}/templates`),
        axios.get(`${API}/portfolios`).catch(() => ({ data: [] }))
      ]);
      setTemplates(templatesRes.data || []);
      setPortfolios(portfoliosRes.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setDocumentTitle(`${template.name} - ${new Date().toLocaleDateString()}`);
    setShowCreateDialog(true);
  };

  const createDocument = async () => {
    if (!documentTitle.trim()) {
      toast.error('Please enter a document title');
      return;
    }

    setCreating(true);
    try {
      // Generate initial content based on template
      const initialContent = generateTemplateContent(selectedTemplate);
      
      const response = await axios.post(`${API}/documents`, {
        title: documentTitle,
        document_type: selectedTemplate.id,
        portfolio_id: (selectedPortfolio && selectedPortfolio !== 'none') ? selectedPortfolio : null,
        template_id: selectedTemplate.id,
        content: initialContent,
        tags: [],
        folder: '/'
      });
      
      // Verify we got a document_id back
      if (!response.data?.document_id) {
        throw new Error('No document ID returned from server');
      }
      
      const documentId = response.data.document_id;
      console.log('Document created with ID:', documentId);
      
      toast.success('Document created');
      setShowCreateDialog(false);
      
      // Navigate to the document editor
      navigate(`/vault/document/${documentId}`);
    } catch (error) {
      console.error('Failed to create document:', error);
      toast.error(error.response?.data?.detail || 'Failed to create document. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const generateTemplateContent = (template) => {
    const templates = {
      declaration_of_trust: `<h1>DECLARATION OF TRUST</h1>

<p>This Declaration of Trust is made and executed on <strong>[DATE]</strong>, establishing the <strong>[TRUST NAME]</strong>.</p>

<h2>ARTICLE I - PARTIES</h2>

<p><strong>GRANTOR/SETTLOR:</strong> [GRANTOR NAME], a private civilian, hereinafter referred to as "Grantor"</p>

<p><strong>TRUSTEE:</strong> [TRUSTEE NAME], hereinafter referred to as "Trustee"</p>

<p><strong>BENEFICIARY:</strong> [BENEFICIARY NAME], hereinafter referred to as "Beneficiary" or "Cestui Que Trust"</p>

<h2>ARTICLE II - TRUST PROPERTY</h2>

<p>The Grantor hereby transfers, assigns, and conveys to the Trustee the property described in Schedule A attached hereto, to be held in trust according to the terms of this Declaration.</p>

<h2>ARTICLE III - GOVERNING PRINCIPLES</h2>

<p>This trust shall be governed by the maxims of equity, including but not limited to:</p>
<ul>
<li>Equity regards as done that which ought to be done</li>
<li>Equity looks to the intent rather than to the form</li>
<li>Equity will not suffer a wrong to be without a remedy</li>
<li>He who seeks equity must do equity</li>
</ul>

<h2>ARTICLE IV - TRUSTEE DUTIES</h2>

<p>The Trustee shall hold, manage, and administer the trust property for the sole benefit of the Beneficiary, exercising the care, skill, and diligence of a prudent person.</p>

<h2>ARTICLE V - TERM AND DURATION</h2>

<p>[TRUST TERM AND DURATION]</p>

<h2>ARTICLE VI - SIGNATURES</h2>

<p>IN WITNESS WHEREOF, the parties have executed this Declaration of Trust on the date first written above.</p>

<p>_________________________<br/>GRANTOR</p>

<p>_________________________<br/>TRUSTEE</p>`,

      trust_transfer_grant_deed: `<h1>TRUST TRANSFER GRANT DEED</h1>

<p>This Trust Transfer Grant Deed is executed on <strong>[DATE]</strong>.</p>

<h2>GRANTING CLAUSE</h2>

<p><strong>[GRANTOR NAME]</strong>, Grantor, for valuable consideration received from <strong>[GRANTEE/TRUSTEE NAME]</strong>, Grantee, hereby GRANTS, BARGAINS, SELLS, and CONVEYS unto the Grantee, as Trustee of the <strong>[TRUST NAME]</strong>, the following described property:</p>

<h2>PROPERTY DESCRIPTION</h2>

<p>[LEGAL DESCRIPTION OF PROPERTY]</p>

<h2>HABENDUM CLAUSE</h2>

<p>TO HAVE AND TO HOLD the above-described property, together with all and singular the rights, privileges, and appurtenances thereunto belonging or in anywise appertaining, unto the Grantee, as Trustee, and to the Grantee's successors in trust, forever.</p>

<h2>COVENANTS</h2>

<p>Grantor covenants that Grantor is lawfully seized of said property, has good right to convey the same, and that the property is free from all encumbrances except as noted herein.</p>

<h2>CONSIDERATION</h2>

<p>The consideration for this conveyance is the Trustee's acceptance of fiduciary duties and obligations under the terms of the [TRUST NAME].</p>

<h2>EXECUTION</h2>

<p>IN WITNESS WHEREOF, Grantor has executed this deed on the date first written above.</p>

<p>_________________________<br/>GRANTOR</p>

<p>STATE OF [STATE]<br/>COUNTY OF [COUNTY]</p>

<p>Before me, the undersigned notary, on this [DATE], personally appeared [GRANTOR NAME], known to me to be the person whose name is subscribed to the foregoing instrument, and acknowledged to me that they executed the same for the purposes therein expressed.</p>

<p>_________________________<br/>NOTARY PUBLIC</p>`,

      acknowledgement_receipt_acceptance: `<h1>ACKNOWLEDGEMENT, RECEIPT, AND ACCEPTANCE</h1>

<p>Date: <strong>[DATE]</strong></p>

<h2>ACKNOWLEDGEMENT</h2>

<p>I, <strong>[TRUSTEE NAME]</strong>, as Trustee, hereby acknowledge and confirm receipt of the following items/property from <strong>[GRANTOR NAME]</strong>, Grantor:</p>

<h2>ITEMS RECEIVED</h2>

<ol>
<li>[ITEM/PROPERTY DESCRIPTION 1]</li>
<li>[ITEM/PROPERTY DESCRIPTION 2]</li>
<li>[ADDITIONAL ITEMS AS NEEDED]</li>
</ol>

<h2>CONSIDERATION</h2>

<p>This receipt acknowledges the transfer of the above-described items in exchange for lawful consideration, to wit: [DESCRIPTION OF CONSIDERATION].</p>

<h2>ACCEPTANCE</h2>

<p>I hereby accept the above-described property as Trustee of the [TRUST NAME], and agree to hold, manage, and administer said property according to the terms of the Declaration of Trust.</p>

<h2>ACKNOWLEDGEMENT OF DUTIES</h2>

<p>I acknowledge my fiduciary duties as Trustee, including but not limited to duties of loyalty, care, prudence, and impartiality toward the Beneficiary.</p>

<p>_________________________<br/>TRUSTEE</p>

<p>Date: _____________</p>`,

      notice_of_interest: `<h1>NOTICE OF INTEREST</h1>

<p>Date: <strong>[DATE]</strong></p>

<h2>NOTICE</h2>

<p>NOTICE IS HEREBY GIVEN that <strong>[DECLARANT NAME]</strong>, as [CAPACITY], claims an equitable interest in the following described property:</p>

<h2>PROPERTY DESCRIPTION</h2>

<p>[DESCRIPTION OF PROPERTY]</p>

<h2>NATURE OF INTEREST</h2>

<p>The nature of the claimed interest is: [DESCRIBE TYPE OF INTEREST - beneficial interest, equitable lien, etc.]</p>

<h2>BASIS OF CLAIM</h2>

<p>This interest arises from: [DESCRIBE BASIS - trust instrument, constructive trust, resulting trust, etc.]</p>

<h2>EFFECTIVE DATE</h2>

<p>This notice is effective as of [DATE].</p>

<h2>PURPOSE</h2>

<p>This notice is provided to put all parties on notice of said equitable interest and to establish priority against subsequent purchasers or encumbrancers.</p>

<p>_________________________<br/>DECLARANT</p>`,

      notice_of_delivery: `<h1>NOTICE OF DELIVERY</h1>

<p>Date: <strong>[DATE]</strong></p>

<h2>NOTICE</h2>

<p>NOTICE IS HEREBY GIVEN of the delivery of the following property/documents from <strong>[SENDER NAME]</strong> to <strong>[RECIPIENT NAME]</strong>:</p>

<h2>ITEMS DELIVERED</h2>

<ol>
<li>[ITEM DESCRIPTION 1]</li>
<li>[ITEM DESCRIPTION 2]</li>
<li>[ADDITIONAL ITEMS]</li>
</ol>

<h2>METHOD OF DELIVERY</h2>

<p>[DESCRIBE METHOD - personal delivery, certified mail, etc.]</p>

<h2>CONDITIONS</h2>

<p>This delivery is made subject to the following conditions: [IF ANY]</p>

<h2>ACKNOWLEDGEMENT OF RECEIPT</h2>

<p>I, [RECIPIENT NAME], hereby acknowledge receipt of the above-described items on [DATE].</p>

<p>_________________________<br/>SENDER</p>

<p>_________________________<br/>RECIPIENT</p>`,

      special_notice_deed_conveyance: `<h1>SPECIAL NOTICE OF DEED OF CONVEYANCE</h1>

<p>Date: <strong>[DATE]</strong></p>

<h2>NOTICE</h2>

<p>SPECIAL NOTICE IS HEREBY GIVEN that on [DATE], a deed of conveyance was executed transferring the following described property:</p>

<h2>PROPERTY DESCRIPTION</h2>

<p>[PROPERTY DESCRIPTION]</p>

<h2>PARTIES</h2>

<p><strong>GRANTOR:</strong> [GRANTOR NAME]</p>
<p><strong>GRANTEE:</strong> [GRANTEE NAME], as Trustee of [TRUST NAME]</p>

<h2>TERMS OF CONVEYANCE</h2>

<p>[DESCRIBE TERMS]</p>

<h2>PURPOSE OF NOTICE</h2>

<p>This notice is provided to establish public record of the conveyance and to put all parties on constructive notice thereof.</p>

<p>_________________________<br/>GRANTOR</p>`,

      affidavit_of_fact: `<h1>AFFIDAVIT OF FACT</h1>

<p>STATE OF [STATE]<br/>COUNTY OF [COUNTY]</p>

<h2>AFFIDAVIT</h2>

<p>I, <strong>[AFFIANT NAME]</strong>, being first duly sworn, depose and state as follows:</p>

<h2>FACTS</h2>

<ol>
<li>I am over the age of eighteen (18) years and competent to make this affidavit.</li>
<li>[FACT 1]</li>
<li>[FACT 2]</li>
<li>[ADDITIONAL FACTS AS NEEDED]</li>
</ol>

<h2>ATTESTATION</h2>

<p>I declare under penalty of perjury that the foregoing is true and correct to the best of my knowledge and belief.</p>

<p>_________________________<br/>AFFIANT</p>

<h2>JURAT</h2>

<p>SUBSCRIBED AND SWORN to before me this ___ day of ____________, 20___.</p>

<p>_________________________<br/>NOTARY PUBLIC</p>

<p>My commission expires: ____________</p>`
    };

    return templates[template.id] || `<h1>${template.name}</h1><p>Begin editing your document...</p>`;
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
      <PageHeader
        icon={FileText}
        title="Templates Studio"
        subtitle="Professional trust document templates ready for customization"
      />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {templates.map((template) => {
          const Icon = iconMap[template.icon] || FileText;
          return (
            <motion.div key={template.id} variants={fadeInUp}>
              <GlassCard
                interactive
                glow
                onClick={() => handleSelectTemplate(template)}
                className="h-full"
              >
                <div className="w-12 h-12 rounded-xl bg-vault-gold/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-vault-gold" />
                </div>
                <h3 className="text-xl font-heading text-white mb-2">{template.name}</h3>
                <p className="text-white/50 text-sm mb-4">{template.description}</p>
                {template.source && (
                  <p className="text-vault-gold/60 text-xs mb-4">{template.source}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/30">{template.fields?.length || 0} fields</span>
                  <span className="text-vault-gold text-sm flex items-center gap-1">
                    Use Template <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}

        {/* Blank Document Option */}
        <motion.div variants={fadeInUp}>
          <GlassCard
            interactive
            onClick={() => handleSelectTemplate({ id: 'custom', name: 'Blank Document', fields: [] })}
            className="h-full border-dashed"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-white/40" />
            </div>
            <h3 className="text-xl font-heading text-white mb-2">Blank Document</h3>
            <p className="text-white/50 text-sm">Start from scratch with a blank document</p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Create Document Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-vault-navy border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading">
              Create {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Customize your document settings before creating
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Document Title</label>
              <Input
                placeholder="Enter document title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-vault-gold"
              />
            </div>
            
            {portfolios.length > 0 && (
              <div>
                <label className="text-white/60 text-sm mb-2 block">Portfolio (Optional)</label>
                <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select a portfolio" />
                  </SelectTrigger>
                  <SelectContent className="bg-vault-navy border-white/10">
                    <SelectItem value="none" className="text-white/70">No Portfolio</SelectItem>
                    {portfolios.map(p => (
                      <SelectItem key={p.portfolio_id} value={p.portfolio_id} className="text-white/70">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createDocument} disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Create Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
