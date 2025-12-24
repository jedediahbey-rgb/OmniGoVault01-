/**
 * Icon Library - Phosphor Icons (Duotone style)
 * 
 * Centralized icon exports for consistent styling across the application.
 * Uses Phosphor Icons with Duotone as primary style, Regular for small/action icons.
 * 
 * Usage:
 *   import { FileText, Plus, Search } from '../lib/icons';
 *   <FileText size={24} weight="duotone" />
 */

import {
  // Navigation & UI
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Check,
  X,
  Plus,
  Minus,
  DotsThree,
  DotsThreeVertical,
  List as ListIcon,
  SquaresFour,
  MagnifyingGlass,
  Funnel,
  GripVertical,
  
  // Files & Documents
  File,
  FileText,
  FilePdf,
  Files,
  Folder,
  FolderOpen,
  FolderSimple,
  Archive,
  Download,
  Upload,
  Copy,
  Printer,
  BookOpen,
  BookBookmark,
  Books,
  Notebook,
  Scroll,
  
  // Actions & Status
  Trash,
  PencilSimple,
  Eye,
  EyeSlash,
  Lock,
  LockOpen,
  Star,
  StarHalf,
  Clock,
  CheckCircle,
  Warning,
  Info,
  Question,
  Bell,
  BellRinging,
  
  // Users & People
  User,
  Users,
  UserCircle,
  UsersThree,
  
  // Business & Finance
  Briefcase,
  Wallet,
  CurrencyDollar,
  Hash,
  Receipt,
  Scales,
  Bank,
  Certificate,
  
  // Communication
  Chat,
  ChatCircle,
  Envelope,
  PaperPlaneTilt,
  
  // AI & Tech
  Sparkle,
  Robot,
  Brain,
  Lightning,
  MagicWand,
  
  // Media & Content
  Play,
  Bookmark,
  BookmarkSimple,
  Tag,
  Link,
  LinkSimple,
  ExternalLink,
  ArrowSquareOut,
  
  // Editor
  TextBolder,
  TextItalic,
  TextHOne,
  TextHTwo,
  ListBullets,
  ListNumbers,
  ArrowUUpLeft,
  ArrowUUpRight,
  
  // Shapes & Misc
  Circle,
  Shield,
  ShieldCheck,
  Trophy,
  Flame,
  Stamp,
  Package,
  GitBranch,
  Calendar,
  MapPin,
  
  // Layout
  SidebarSimple,
  Rows,
  Columns,
  SquareHalf,
  
} from '@phosphor-icons/react';

// Re-export with consistent naming that matches common usage patterns
export {
  // Navigation & UI
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  CaretDown as ChevronDown,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  CaretUp as ChevronUp,
  Check,
  X,
  Plus,
  Minus,
  DotsThree as MoreHorizontal,
  DotsThreeVertical as MoreVertical,
  ListIcon as List,
  SquaresFour as Grid,
  MagnifyingGlass as Search,
  Funnel as Filter,
  GripVertical,
  SidebarSimple as Menu,
  
  // Files & Documents
  File,
  FileText,
  FilePdf,
  Files,
  Folder,
  FolderOpen,
  FolderSimple,
  FolderSimple as FolderArchive,
  Archive,
  Download,
  Upload,
  Copy,
  Printer,
  BookOpen,
  BookBookmark,
  Books,
  Notebook,
  Scroll,
  
  // Actions & Status
  Trash,
  Trash as Trash2,
  PencilSimple as Edit2,
  PencilSimple as Edit3,
  Eye,
  EyeSlash,
  Lock,
  LockOpen as Unlock,
  Star,
  Star as StarOff, // Will style differently in component
  Clock,
  CheckCircle,
  Warning as AlertTriangle,
  Info,
  Question as HelpCircle,
  Bell,
  BellRinging,
  ArrowUUpLeft as RotateCcw,
  
  // Users & People
  User,
  Users,
  UserCircle,
  UsersThree,
  
  // Business & Finance
  Briefcase,
  Wallet,
  CurrencyDollar as DollarSign,
  Hash,
  Receipt,
  Scales as Scale,
  Bank,
  Certificate,
  
  // Communication
  Chat,
  ChatCircle as MessageSquare,
  Envelope as Mail,
  PaperPlaneTilt as Send,
  
  // AI & Tech
  Sparkle as Sparkles,
  Robot as Bot,
  Brain,
  Lightning,
  MagicWand as Wand2,
  
  // Media & Content
  Play,
  Bookmark,
  BookmarkSimple,
  BookmarkSimple as BookmarkCheck,
  Tag,
  Link,
  LinkSimple as Link2,
  ArrowSquareOut as ExternalLink,
  
  // Editor
  TextBolder as Bold,
  TextItalic as Italic,
  TextHOne as Heading1,
  TextHTwo as Heading2,
  ListBullets as ListUnordered,
  ListNumbers as ListOrdered,
  ArrowUUpLeft as Undo,
  ArrowUUpRight as Redo,
  
  // Shapes & Misc
  Circle,
  Shield,
  ShieldCheck,
  Trophy,
  Flame,
  Stamp,
  Package,
  GitBranch,
  Calendar,
  MapPin,
  
  // Save action  
  Download as Save,
  
  // Search variants
  MagnifyingGlass as FileSearch,
  
  // Book variants
  BookOpen as BookText,
};

// Default icon weight for the application
export const DEFAULT_ICON_WEIGHT = 'duotone';

// Smaller icons should use regular weight
export const SMALL_ICON_WEIGHT = 'regular';

/**
 * Helper component wrapper for consistent icon styling
 * Usage: <Icon icon={FileText} size={24} />
 */
export const iconDefaults = {
  weight: 'duotone',
  className: 'text-current',
};
