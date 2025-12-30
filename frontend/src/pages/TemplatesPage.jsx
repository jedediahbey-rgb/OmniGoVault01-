import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  ArrowRight,
  Bell,
  Certificate,
  CheckCircle,
  CircleNotch,
  FileText,
  Gavel,
  Handshake,
  Package,
  Plus,
  Scales,
  Scroll,
  Seal,
  Sparkle,
  Stamp,
  UserCircleCheck
} from '@phosphor-icons/react';
import PageHeader from '../components/shared/PageHeader';
import PageHelpTooltip from '../components/shared/PageHelpTooltip';
import GlassCard from '../components/shared/GlassCard';
import IconBadge from '../components/shared/IconBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
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
  scale: Scales,
  handshake: Handshake,
  certificate: Certificate,
  gavel: Gavel,
  seal: Seal,
  'user-check': UserCircleCheck
};

export default function TemplatesPage({ user }) {
  const navigate = useNavigate();
  const titleInputRef = useRef(null);
  const triggerRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  // Get default portfolio from localStorage
  const defaultPortfolioId = localStorage.getItem('defaultPortfolioId') || '';
  const [selectedPortfolio, setSelectedPortfolio] = useState(defaultPortfolioId);
  const [creating, setCreating] = useState(false);
  
  // AI Generation state
  const [showAiGenerateDialog, setShowAiGenerateDialog] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Handler to open portfolio dropdown - prevents opening if title input is focused
  const handlePortfolioPointerDown = (e) => {
    // If title input is focused, just blur it and don't open dropdown
    if (document.activeElement === titleInputRef.current) {
      e.preventDefault();
      e.stopPropagation();
      titleInputRef.current.blur();
      return; // Don't open - user will tap again
    }
  };

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
      
      // Use the template's reserved subject code (01-09)
      const subjectCode = selectedTemplate.subject_code || '00';
      
      const response = await axios.post(`${API}/documents`, {
        title: documentTitle,
        document_type: selectedTemplate.id,
        portfolio_id: (selectedPortfolio && selectedPortfolio !== '__none__') ? selectedPortfolio : null,
        template_id: selectedTemplate.id,
        subject_code: subjectCode,
        content: initialContent,
        tags: [],
        folder: '/'
      });
      
      // Verify we got a document_id back
      if (!response.data?.document_id) {
        throw new Error('No document ID returned from server');
      }
      
      const documentId = response.data.document_id;
      console.log('Document created with ID:', documentId, 'RM-ID:', response.data.rm_id);
      
      toast.success(`Document created with RM-ID: ${response.data.rm_id || 'pending'}`);
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

  const handleAiGenerate = () => {
    if (!selectedPortfolio || selectedPortfolio === '__none__') {
      toast.error('Please select a portfolio for AI generation');
      return;
    }
    setShowCreateDialog(false);
    setShowAiGenerateDialog(true);
  };

  const aiGenerateDocument = async () => {
    if (!aiInstructions.trim()) {
      toast.error('Please provide instructions for the AI');
      return;
    }
    if (!selectedPortfolio || selectedPortfolio === '__none__') {
      toast.error('Please select a portfolio');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await axios.post(`${API}/assistant/generate-document`, {
        template_id: selectedTemplate.id,
        portfolio_id: selectedPortfolio,
        instructions: aiInstructions,
        title: documentTitle || `AI Generated: ${selectedTemplate.name}`
      });

      toast.success('Document generated by AI');
      setShowAiGenerateDialog(false);
      setAiInstructions('');
      
      // Navigate to the new document
      navigate(`/vault/document/${response.data.document_id}`);
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(error.response?.data?.detail || 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const generateTemplateContent = (template) => {
    const templates = {
      declaration_of_trust: `<h1 style="text-align: center;">DECLARATION OF TRUST</h1>
<p style="text-align: center;"><em>A Private Trust expressed under the Laws of Equity</em></p>

<p>This Declaration of Trust ("Trust") is a formal written and expressed trust indenture establishing the special trust relationship between the parties for all transaction(s)/account(s) as the corpus "res" of this Trust belonging to the Estate of <strong>[GRANTOR NAME]</strong> of <strong>[COUNTY]</strong> County and any derivations by this Grantor/Settlor successors and assigns, jointly and severally, and this Trust's Trustee and Co-Trustee ("Trustees") and anyone appointed under the authority of this Trust.</p>

<h2>FIRST</h2>
<p>It is the will and intent of the Grantor that the beneficiary be united with, for his use, enjoyment, life maintenance, pursuit of happiness, all the property, rights, titles and interest and their transmutations and derivations therefrom of said res/corpus of said Estate. Grantor declares this Trust is hereinafter titled <strong>[RM-ID] Trust</strong>, an equitable asset title, and all its chattels therewith and therefrom. Grantor hereby transfers Certificate of Legal Title of [RM-ID] Trust to Trustees for special purpose; see trustee's acceptance and deed of transfer.</p>

<p><strong>OTHER SPECIAL PURPOSE</strong><br/>
a. The purpose of the trust is to re-unite, delivery, transfer, merge titles for all the corpus of this Trust.</p>

<h2>SECOND</h2>
<p>The Trustee shall receive and hold said property, together with any additions hereto in Trust for the use and benefit of the sole bona fide Trust beneficial interest holder in due course. The beneficiary of this Trust shall hold Trust Certificate <strong>[RM-ID]-00.001</strong> through <strong>[RM-ID]-99.999</strong> by both the settlor and trustee. Beneficiary is competent with age of majority sufficient to terminate any presumed or express trust relation and possesses all right, title and interest in the trust without granting a waiver of any right, remedy, or defense shall have whole, complete, enforceable and superior claim to equitable title of [RM-ID].</p>

<h2>THIRD</h2>
<p>Trust is revocable and modifiable by the Grantor/Settlor with all rights reserved and continue for a term of five years from the date of trust res transfer to Trustees. Trust shall also be renewable, if renewed prior to its termination. This can be extinguished upon a conveyance of legal title to the beneficiary signed by both trustee and co-trustee.</p>

<h2>FOURTH</h2>
<p>This Trust shall be administered, managed, governed and regulated in all respects according to the laws of equity, under judicial power and inherited civilian due process protections.</p>

<h2>FIFTH - TRUSTEE POWERS</h2>
<p>The Trustees, in addition to all other power granted by this expression and by law, shall have the following additional powers with respect to the Trust:</p>

<p><strong>MORTGAGES, PLEDGES AND DEEDS OF TRUST</strong><br/>
To enforce any and all mortgages, pledges and deeds of Trust held by the Trust and to purchase at any sale thereunder any such real or personal property subject to any mortgage, pledge or deed of Trust.</p>

<p><strong>LITIGATION</strong><br/>
To initiate or defend, at the discretion of the Trustees, any litigation affecting the Trust.</p>

<p><strong>ADJUSTMENT OF CLAIMS</strong><br/>
To submit to a court of Equity, or in private, to compromise or to release or otherwise adjust without compensation, any and all claims affecting the Trust estate.</p>

<h2>SIXTH</h2>
<p>Trustees full commercial and personal liability for the faithful performance of duties shall be required of any Trustees under this expression.</p>

<h2>SEVENTH</h2>
<p>The Trustees shall receive reasonable emolument for the services performed by the Trustees, but such emolument shall not exceed the amount customarily received by corporate fiduciaries in the area for like services.</p>

<h2>EIGHTH</h2>
<p>No Trustees or Trust Manager, created by this Notice shall at any time be held liable for any action or default of any Trustees, or any other person in connection with the administration and management of this Trust unless caused by the individual(s) own gross negligence or by commission of a willful act of breach of Trust. Trustee <strong>[TRUSTEE NAME]</strong> is hereby appointed the Registered Agent for service of process.</p>

<h2>NINTH</h2>
<p>In the event that any portion of this Trust shall be held unlawful, invalid or otherwise inoperative, it is the intention of the Grantor that all of the other provisions hereof shall continue to be fully effective and operative insofar as is possible and reasonable.</p>

<h2>TENTH</h2>
<p>If any person claims to have a superior claim to the rights, title, deeds and interest of the Trust or by Grantor/Settlor/Beneficiary they are ordered to present their prima facie claim under their full personal commercial liability under sworn affidavit under the laws of perjury stating they have a superior claim to asset, title, or deed to Grantor/Settlor/Beneficiary.</p>

<h2>ELEVENTH - EXECUTION</h2>
<p>IN WITNESS WHEREOF, I hereunto set my hand and seal on this <strong>[DATE]</strong> and hereby declare under oath the execution, creation and establishment of this Trust:</p>

<p style="margin-top: 40px;">_________________________<br/><strong>[GRANTOR NAME]</strong>, Grantor/Settlor</p>

<p style="margin-top: 40px;"><strong>STATE OF [STATE]</strong><br/><strong>COUNTY OF [COUNTY]</strong></p>

<p><strong>CERTIFICATE OF JURAT</strong><br/>
On this [DATE], before me, the undersigned notary public, duly authorized, empowered and admitted to take jurats appeared [GRANTOR NAME], personally known to me to be the person whose name is subscribed to the foregoing instrument, and acknowledged to me that they executed the same for the purposes therein expressed.</p>

<p style="margin-top: 40px;">_________________________<br/>NOTARY PUBLIC<br/>My commission expires: _____________</p>`,

      trust_transfer_grant_deed: `<h1 style="text-align: center;">SPECIAL NOTICE OF DEED OF CONVEYANCE</h1>
<p style="text-align: center;"><em>Notice of Issuance of Certificate of Legal Title</em></p>

<p>This is Actual and Constructive Special Notice by the grantee—a private Citizen for sufficient private lawful and valuable consideration of the non-negotiable asset title number <strong>"[RM-ID]-01.001"</strong> thru <strong>"[RM-ID]-99.999"</strong> along with their unique special deposit assigned special deposit title(s) sub-record(s), if any, for each said title and their attachments proceeds therefrom, now coming as the grantor/settlor "Grantor," hereby notice that said same legal title of said number is hereby fully granted, conveyed, and delivered to trustee(s) or grantee(s). The record(s) are being held in the private.</p>

<p>It is Grantor's intent, purpose, freewill act and deed to execute this special notice of lawful actual and/or constructive grant and conveyance of the special deposit(s) and/or special interests per Grantor's special indentured instructions.</p>

<h2>CONTACT INFORMATION</h2>
<p>If there is any information regarding this that needs to be gleaned, please contact the grantor at the address:</p>

<p><strong>[GRANTOR NAME]</strong><br/>
Private Citizen<br/>
C/o: <strong>[ADDRESS]</strong><br/>
<strong>[CITY, STATE, COUNTY]</strong></p>

<p>Grantor/Settlor expressly reserves all rights and liberties.</p>

<h2>EXECUTION</h2>
<p>Signed, sealed, acknowledged and specially deposited:</p>

<p style="margin-top: 40px;">_________________________<br/><strong>[GRANTOR NAME]</strong>, Grantee Grantor/Settlor</p>

<p style="margin-top: 20px;"><strong>Bill in Equity #:</strong> _____________</p>
<p><strong>Assigned to:</strong> _____________</p>
<p><strong>Optional Notes:</strong></p>`,

      acknowledgement_receipt_acceptance: `<h1 style="text-align: center;">NOTICE OF ACKNOWLEDGEMENT, RECEIPT, AND ACCEPTANCE</h1>

<p><strong>To:</strong> [RECIPIENT]<br/>
<strong>From:</strong> <strong>[GRANTOR NAME]</strong>, grantee, private Citizen</p>

<p><strong>Re:</strong> <strong>[DATE]</strong> USPS Registered Envelope Account Number <strong>[RM-ID]</strong>, hereinafter "ACCOUNT," signed by grantee.</p>

<h2>DECLARATION</h2>
<p>LET IT BE KNOWN BY ALL MEN AND PERSONS WORLDWIDE BY THESE WORDS, I, the undersigned, <strong>[GRANTOR NAME]</strong> grantee herein, private Citizen, by my freewill act and Deed, execute this Deed of my acknowledgement, receipt, and acceptance ab initio for private lawful consideration of one stamp of lawful currency canceled/signed by grantee, and other sufficient valuable lawful consideration tendered by grantee, on <strong>[DATE]</strong> for absolute estate in/for above referenced ACCOUNT and all attachments and transmutations therefrom pursuant to Maxims of Equity:</p>

<ul>
<li>Equity will not aid a volunteer</li>
<li>Equity will not perfect an imperfect gift</li>
<li>Where there are equal equities priority prevails</li>
<li>Where there are equal equities the law shall prevail</li>
</ul>

<h2>EXECUTION</h2>
<p>Performed under my hand and seal freewill act, volition and Deed:</p>

<p style="margin-top: 40px;">_________________________<br/><strong>[GRANTOR NAME]</strong>, grantee<br/>
Without prejudice, without recourse<br/>
Private Citizen</p>

<p>Envelope In Care of: <strong>[ADDRESS]</strong><br/>
<strong>[CITY, STATE, COUNTY]</strong></p>

<p style="margin-top: 30px;"><strong>Signed in the presence of:</strong></p>
<p>_________________________<br/>Private Witness 1, Without Prejudice</p>
<p>_________________________<br/>Private Witness 2, Without Prejudice</p>`,

      notice_of_interest: `<h1 style="text-align: center;">NOTICE OF INTEREST</h1>
<p style="text-align: center;"><em>An Established Right of a Purely Equitable Nature</em></p>

<p>This is Actual and Constructive Special Notice by the heir grantee—a private Citizen for sufficient private lawful and valuable consideration of the non-negotiable asset title number(s) <strong>"[RM-ID]-01.001"</strong> thru <strong>"[RM-ID]-99.999"</strong> along with all their unique assigned sub-record special deposit title(s), now coming as the grantor/settlor "Grantor," assigning each said title to, but not limited to, the sum of all their attachments, issues, interest, assets, rents, derivatives and proceeds therefrom are fully claimed, titled, assigned, withdrawn from general deposit/general public relations, and the records are being held in the private.</p>

<p>It is Grantor's manifest intent, special purpose, freewill act and deed to execute this special notice of interest and deed of withdrawal from general deposit Grantor's special interests per Grantor's private indentured instructions, if any.</p>

<h2>CONTACT INFORMATION</h2>
<p>If there is any information regarding this that needs to be gleaned, please contact the Grantor at the address:</p>

<p><strong>[GRANTOR NAME]</strong><br/>
Private Citizen<br/>
C/o: <strong>[ADDRESS]</strong><br/>
<strong>[CITY, STATE, COUNTY]</strong></p>

<p>Grantor expressly reserves all rights and liberties.</p>

<h2>EXECUTION</h2>
<p>Signed, sealed, acknowledged and specially deposited:</p>

<p style="margin-top: 40px;">_________________________<br/><strong>[GRANTOR NAME]</strong>, Grantee Grantor/Settlor</p>

<p style="margin-top: 20px;"><strong>Bill in Equity #:</strong> _____________</p>
<p><strong>Assigned to:</strong> _____________</p>
<p><strong>Optional Notes:</strong></p>`,

      notice_of_delivery: `<h1 style="text-align: center;">NOTICE OF DELIVERY</h1>
<p style="text-align: center;"><em>Statement of Interest</em></p>

<p>This is Actual and Constructive Special Notice by the grantee—private Citizen for sufficient private lawful and valuable consideration of the non-negotiable asset title number(s) <strong>"[RM-ID]-01.001"</strong> thru <strong>"[RM-ID]-99.999"</strong> that are assigned, along with, if any, their unique special deposit title(s), and the sum of all their attachments, interest, issues, rents, assets, derivative's and proceeds therefrom, now coming as the grantor/settlor "Grantor," hereby give notice of actual and/or constructive delivery of same title(s) and intends it to be treated as on special deposit(s) in trust for special purpose.</p>

<p>The delivery records are being held in the private. It is Grantor's manifest intent, special purpose, freewill act and deed to execute this special notice of lawful actual and/or constructive delivery of the special deposit(s) per Grantor's special indentured instructions, if any.</p>

<h2>CONTACT INFORMATION</h2>
<p>If there is any information regarding this that needs to be gleaned, please contact the Grantor/Settlor at the address:</p>

<p><strong>[GRANTOR NAME]</strong><br/>
Private Citizen<br/>
C/o: <strong>[ADDRESS]</strong><br/>
<strong>[CITY, STATE, COUNTY]</strong></p>

<p>Grantor expressly reserves all rights and liberties.</p>

<h2>EXECUTION</h2>
<p>Signed, sealed, acknowledged and specially deposited:</p>

<p style="margin-top: 40px;">_________________________<br/><strong>[GRANTOR NAME]</strong>, Grantee Grantor/Settlor</p>

<p style="margin-top: 20px;"><strong>Bill in Equity #:</strong> _____________</p>
<p><strong>Assigned to:</strong> _____________</p>
<p><strong>Optional Notes:</strong></p>`,

      trustee_acceptance: `<h1 style="text-align: center;">NOTICE OF ACCEPTANCE BY TRUSTEE</h1>
<p style="text-align: center;"><em>Notice of Receipt of Certificate of Legal Title</em></p>

<p>This is Actual and Constructive Special Notice by the trustee — I, <strong>[TRUSTEE NAME]</strong>, named to be the sole exclusive Trustee by nature under exclusive jurisdiction in the foregoing instrument, for myself; I hereby acknowledge the receipt of the foregoing original executed legal title <strong>"[RM-ID]"</strong> along with all their unique assigned sub-record special deposit title(s) of said estate from creating said Trust;</p>

<p>I agree to accept the said Trust, and enter upon its performance; I additionally do accept for/with consideration stated the office of the Registered Agent in the name of the Trust at the mailing location listed below, and that I will faithfully perform the duties and obligations imposed upon me herein, to the best of my ability; I will faithfully account to the said <strong>"[RM-ID]" Trust</strong> along with all their unique assigned sub-record special deposit title(s) for all res/funds/monies received by me for the purpose of said trust.</p>

<h2>CONTACT INFORMATION</h2>
<p>If there is any information regarding this that needs to be gleaned, please contact the Trustee at:</p>

<p><strong>[TRUSTEE NAME]</strong><br/>
Private Citizen<br/>
C/o: <strong>[ADDRESS]</strong><br/>
<strong>[CITY, STATE, COUNTY]</strong></p>

<h2>EXECUTION</h2>
<p>IN WITNESS WHEREOF, the undersigned Trustee executes this instrument by their own free will act, volition, and deed on this <strong>[DATE]</strong>.</p>

<p style="text-align: center; margin-top: 30px;"><strong>[RM-ID] Trust</strong></p>

<p style="margin-top: 40px;">_________________________<br/><strong>[TRUSTEE NAME]</strong>, Trustee</p>

<p style="margin-top: 30px;"><strong>Signed in the presence of:</strong></p>
<p>_________________________<br/>Private Witness 1, Without Prejudice</p>
<p>_________________________<br/>Private Witness 2, Without Prejudice</p>

<h2>CERTIFICATE OF ACKNOWLEDGEMENT</h2>
<p><strong>STATE OF [STATE]</strong><br/><strong>COUNTY OF [COUNTY]</strong></p>

<p>On this [DATE], before me, the undersigned notary public duly authorized, appeared <strong>[TRUSTEE NAME]</strong>, Trustee, personally known to me to be the person whose name is scribed within the instrument, and acknowledges, freely marks, and impresses assent to this declaration and vows it to be their own free will self-determined act and volition.</p>

<p style="margin-top: 40px;">_________________________<br/>NOTARY PUBLIC<br/>My commission expires: _____________</p>`,

      certificate_of_trust: `<h1 style="text-align: center;">CERTIFICATE OF FOREIGN GRANTOR TRUST</h1>

<p>By Individual Private Citizen, under "Full Faith and Credit" <strong>[GRANTOR NAME]</strong> being duly sworn, on oath says as follows:</p>

<ol>
<li>The name of the Foreign Grantor Trust is: <strong>[TRUST NAME]</strong> or alternatively, <strong>[RM-ID]-00.001</strong> thru <strong>[RM-ID]-99.999</strong>;</li>
<li>The creation date of the Trust Instrument is: <strong>[CREATION DATE]</strong>;</li>
<li>The execution date of the Trust Instrument is: <strong>[EXECUTION DATE]</strong>;</li>
<li>Grantor does deliver special deposit consisting of <strong>[CONSIDERATION]</strong> creating the trust;</li>
<li>The name of each Grantor of the Trust is: <strong>[GRANTOR NAME]</strong>;</li>
<li>The name of the sole Trustee is: <strong>[TRUSTEE NAME]</strong>;</li>
<li>The name and address of the Trustee empowered to act under the Trust Instrument at the time of execution of this Certificate is:<br/>
<strong>[TRUSTEE NAME]</strong>, Ttee<br/>
<strong>[TRUST NAME]</strong><br/>
C/o: <strong>[ADDRESS]</strong><br/>
<strong>[CITY, STATE, COUNTY]</strong></li>
<li>The Trustee has full dispositive and discretionary powers and is authorized by the Instrument to sell, convey, pledge, mortgage, lease, or transfer title to any interest in real or personal property, EXCEPT as limited by the following: <strong>[LIMITATIONS OR "None"]</strong>;</li>
<li>Any other Trust provisions the undersigned wishes to include: <strong>[ADDITIONAL PROVISIONS OR "None"]</strong>;</li>
<li>The Foreign Grantor Trust is irrevocable and has not terminated nor been revoked; and</li>
<li>The statements contained in the Certificate of Trust are true and correct and there are no other provisions in the Trust Instrument or amendments to it that limit the powers of the Trustee to sell, convey, pledge, mortgage, lease, or transfer title to rights or interests in real or personal property either legal or equitable.</li>
<li>No person or entity paying money to or delivering property to any Trustee shall be required to see to its applicability. All persons relying on this Certificate of Trust regarding the Trustees and their powers over Trust property shall be held harmless from any resulting loss or liability from such reliance. A copy of this Certificate of Trust shall be just as valid as the original.</li>
</ol>

<h2>EXECUTION</h2>
<p>Scribed on this <strong>[DATE]</strong> under my hand and seal affirmed under oath with intent, special purpose, freewill act and Deed under the Law of God and the Maxims of Equity.</p>

<p style="text-align: center; margin-top: 30px;"><strong>[TRUST NAME]</strong></p>

<p style="margin-top: 40px;">_________________________<br/>By: <strong>[TRUSTEE NAME]</strong>, Trustee</p>

<p style="margin-top: 30px;"><strong>Signed in the presence of:</strong></p>
<p>_________________________<br/>Private Witness 1, Without Prejudice</p>
<p>_________________________<br/>Private Witness 2, Without Prejudice</p>

<h2>CERTIFICATE OF JURAT</h2>
<p><strong>STATE OF [STATE]</strong><br/><strong>COUNTY OF [COUNTY]</strong></p>

<p>On this [DATE], before me, the undersigned notary public, duly authorized, empowered and admitted to take jurats appeared <strong>[TRUSTEE NAME]</strong>, Trustee, personally known to me to be the person who subscribed before me the "Certificate of Foreign Grantor Trust" document and who affirmed before me under oath that the contents of the document are truthful and accurate to the best of their knowledge and belief.</p>

<p style="margin-top: 40px;">_________________________<br/>NOTARY PUBLIC<br/>My commission expires: _____________</p>`,

      affidavit_of_fact: `<h1 style="text-align: center;">AFFIDAVIT OF FACT</h1>

<p><strong>STATE OF [STATE]</strong><br/><strong>COUNTY OF [COUNTY]</strong></p>

<h2>AFFIDAVIT</h2>
<p>I, <strong>[AFFIANT NAME]</strong>, being first duly sworn, depose and state as follows:</p>

<h2>FACTS</h2>
<ol>
<li>I am over the age of eighteen (18) years and competent to make this affidavit.</li>
<li>I am the <strong>[CAPACITY - e.g., Grantor/Settlor/Trustee/Beneficiary]</strong> of the trust known as <strong>[TRUST NAME]</strong> or <strong>[RM-ID] Trust</strong>.</li>
<li><strong>[FACT 1]</strong></li>
<li><strong>[FACT 2]</strong></li>
<li><strong>[ADDITIONAL FACTS AS NEEDED]</strong></li>
</ol>

<h2>ATTESTATION</h2>
<p>I declare under penalty of perjury that the foregoing is true and correct to the best of my knowledge and belief.</p>

<p style="margin-top: 40px;">_________________________<br/><strong>[AFFIANT NAME]</strong>, Affiant</p>

<p style="margin-top: 30px;"><strong>Signed in the presence of:</strong></p>
<p>_________________________<br/>Private Witness 1, Without Prejudice</p>
<p>_________________________<br/>Private Witness 2, Without Prejudice</p>

<h2>CERTIFICATE OF JURAT</h2>
<p><strong>STATE OF [STATE]</strong><br/><strong>COUNTY OF [COUNTY]</strong></p>

<p>On this [DATE], before me, the undersigned notary public, duly authorized, empowered and admitted to take jurats appeared <strong>[AFFIANT NAME]</strong>, personally known to me to be the person who subscribed before me this Affidavit and who affirmed before me under oath that the contents are truthful and accurate to the best of their knowledge and belief.</p>

<p style="margin-top: 40px;">_________________________<br/>NOTARY PUBLIC<br/>My commission expires: _____________</p>`,

      special_notice_deed_conveyance: `<h1 style="text-align: center;">SPECIAL NOTICE OF DEED OF CONVEYANCE</h1>
<p style="text-align: center;"><em>Notice of Issuance of Certificate of Legal Title</em></p>

<p>This is Actual and Constructive Special Notice by the grantee—a private Citizen for sufficient private lawful and valuable consideration of the non-negotiable asset title number <strong>"[RM-ID]-01.001"</strong> thru <strong>"[RM-ID]-99.999"</strong> along with their unique special deposit assigned special deposit title(s) sub-record(s), if any, for each said title and their attachments proceeds therefrom, now coming as the grantor/settlor "Grantor," hereby notice that said same legal title of said number is hereby fully granted, conveyed, and delivered to trustee(s) or grantee(s).</p>

<p>The record(s) are being held in the private. It is Grantor's intent, purpose, freewill act and deed to execute this special notice of lawful actual and/or constructive grant and conveyance of the special deposit(s) and/or special interests per Grantor's special indentured instructions.</p>

<h2>CONTACT INFORMATION</h2>
<p>If there is any information regarding this that needs to be gleaned, please contact the grantor at the address:</p>

<p><strong>[GRANTOR NAME]</strong><br/>
Private Citizen<br/>
C/o: <strong>[ADDRESS]</strong><br/>
<strong>[CITY, STATE, COUNTY]</strong></p>

<p>Grantor/Settlor expressly reserves all rights and liberties.</p>

<h2>EXECUTION</h2>
<p>Signed, sealed, acknowledged and specially deposited:</p>

<p style="margin-top: 40px;">_________________________<br/><strong>[GRANTOR NAME]</strong>, Grantee Grantor/Settlor</p>

<p style="margin-top: 20px;"><strong>Bill in Equity #:</strong> _____________</p>
<p><strong>Assigned to:</strong> _____________</p>
<p><strong>Optional Notes:</strong></p>`
    };

    return templates[template.id] || `<h1>${template.name}</h1><p>Edit this document with your specific details.</p>`;
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
        subtitleAction={<PageHelpTooltip pageKey="templates" />}
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
                className="h-full flex flex-col"
              >
                {/* Icon - Centered at top */}
                <div className="w-12 h-12 rounded-xl bg-vault-gold/10 flex items-center justify-center mb-4 mx-auto sm:mx-0">
                  <Icon className="w-6 h-6 text-vault-gold" weight="duotone" />
                </div>
                
                {/* Content area - grows to fill space */}
                <div className="flex-1 flex flex-col">
                  <h3 className="text-lg font-heading text-white mb-2 text-center sm:text-left">{template.name}</h3>
                  <p className="text-white/50 text-sm mb-3 flex-1 text-center sm:text-left">{template.description}</p>
                  {template.source && (
                    <p className="text-vault-gold/60 text-xs mb-3 text-center sm:text-left">{template.source}</p>
                  )}
                </div>
                
                {/* Action - Always at bottom, aligned right */}
                <div className="flex items-center justify-end pt-2 border-t border-white/5 mt-auto">
                  <span className="text-vault-gold text-sm flex items-center gap-1.5 font-medium">
                    Use Template <ArrowRight className="w-4 h-4" weight="bold" />
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
            className="h-full border-dashed flex flex-col"
          >
            {/* Icon - Centered at top */}
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 mx-auto sm:mx-0">
              <Plus className="w-6 h-6 text-white/40" weight="duotone" />
            </div>
            
            {/* Content area */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-lg font-heading text-white mb-2 text-center sm:text-left">Blank Document</h3>
              <p className="text-white/50 text-sm flex-1 text-center sm:text-left">Start from scratch with a blank document</p>
            </div>
            
            {/* Action - Always at bottom */}
            <div className="flex items-center justify-end pt-2 border-t border-white/5 mt-auto">
              <span className="text-white/40 text-sm flex items-center gap-1.5 font-medium">
                Create <ArrowRight className="w-4 h-4" weight="bold" />
              </span>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Create Document Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-vault-navy border-white/10 w-[95vw] max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white font-heading text-lg">
              Create {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription className="text-white/50 text-sm">
              Customize your document settings before creating
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Document Title</label>
              <Input
                ref={titleInputRef}
                placeholder="Enter document title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-vault-gold"
              />
            </div>
            
            {portfolios.length > 0 && (
              <div>
                <label className="text-white/60 text-sm mb-2 block">Portfolio (Optional)</label>
                <Select 
                  value={selectedPortfolio} 
                  onValueChange={setSelectedPortfolio}
                >
                  <SelectTrigger 
                    ref={triggerRef}
                    className="bg-white/5 border-white/10"
                    onPointerDown={handlePortfolioPointerDown}
                  >
                    <SelectValue placeholder="Select a portfolio" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-vault-navy border-white/10 z-[9999]"
                    position="popper"
                    sideOffset={4}
                  >
                    <SelectItem value="__none__" className="text-white/70">No Portfolio</SelectItem>
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
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleAiGenerate}
              disabled={!selectedPortfolio || selectedPortfolio === '__none__'}
              className="btn-secondary w-full sm:w-auto"
            >
              <Sparkle className="w-4 h-4 mr-2" weight="duotone" />
              Generate with AI
            </Button>
            <Button onClick={createDocument} disabled={creating} className="btn-primary w-full sm:w-auto">
              {creating ? 'Creating...' : 'Create Blank Doc'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={showAiGenerateDialog} onOpenChange={setShowAiGenerateDialog}>
        <DialogContent className="bg-vault-navy border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white font-heading flex items-center gap-2">
              <Sparkle className="w-5 h-5 text-vault-gold" weight="duotone" />
              Generate Document with AI
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Tell the AI what information to include in your {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Document Title</label>
              <Input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder={`AI Generated: ${selectedTemplate?.name || 'Document'}`}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Instructions for AI *</label>
              <Textarea
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder={`Describe what should be in this document. For example:\n- Grantor: John Smith\n- Trustee: Jane Doe\n- Property: 123 Main Street\n- Include standard trust terms...`}
                className="bg-white/5 border-white/10 min-h-[150px]"
              />
              <p className="text-white/30 text-xs mt-2">
                The AI will use your trust profile information along with these instructions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowAiGenerateDialog(false); setAiInstructions(''); }}>
              Cancel
            </Button>
            <Button onClick={aiGenerateDocument} disabled={aiGenerating || !aiInstructions.trim()} className="btn-primary">
              {aiGenerating ? (
                <>
                  <CircleNotch className="w-4 h-4 mr-2 animate-spin" weight="duotone" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkle className="w-4 h-4 mr-2" weight="duotone" />
                  Generate Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
