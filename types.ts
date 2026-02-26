
export type Page = 
  | 'dashboard' 
  | 'directory' 
  | 'agenda' 
  | 'articles' 
  | 'tasks' 
  | 'suppliers' 
  | 'artisans' 
  | 'institutional' 
  | 'prescriber' 
  | 'subcontractor' 
  | 'projects' 
  | 'kpi' 
  | 'company'
  | 'profile';

export interface User {
  name: string;
  avatar: string;
  uid?: string;
  companyId?: string;
  role?: string;
  email?: string;
}

export interface Client {
  id: string;
  name: string;
  addedBy: User;
  origin: string;
  location: string;
  projectCount?: number;
  status: 'Prospect' | 'Client' | 'Leads';
  dateAdded: string;
  companyId?: string;
  details?: {
    civility?: string;
    lastName?: string;
    firstName?: string;
    email?: string;
    phone?: string;
    fixed?: string;
    address?: string;
    city?: string;
    postcode?: string;
    lat?: number | null;
    lng?: number | null;
    complement?: string;
    category?: string;
    subOrigin?: string;
    referent?: string;
    rgpd?: boolean;
    website?: string;
    selectionStatus?: string;
    supplierType?: string;
    branch?: string;
    trades?: string[];
    properties?: any[];
    externalContacts?: any[];
    directoryContacts?: any[];
    [key: string]: any;
  };
}

export interface Task {
  id: string;
  title: string;
  subtitle?: string; 
  tag?: string;
  tagColor?: 'blue' | 'gray' | 'purple' | 'pink';
  type: 'Tâche auto' | 'Tâche manuelle' | 'Mémo';
  date?: string;
  progress?: number; 
  status: 'pending' | 'in-progress' | 'completed';
  statusLabel?: string; 
  statusType: 'progress' | 'toggle'; 
  isLate?: boolean;
  collaborator: User;
  hasNote?: boolean;
  companyId?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  title: string;
  type: 'R1' | 'R2' | 'Métré' | 'Pose' | 'SAV' | 'Autre';
  date: string;
  startTime: string;
  endTime: string;
  location: 'Showroom' | 'Domicile' | 'Visio' | 'Autre';
  status: 'confirmé' | 'en attente' | 'annulé' | 'effectué';
  collaborator: User;
  companyId: string;
  createdAt: string;
}

export interface FinancialKPI {
  id: string;
  label: string;
  value: string;
  target: string;
  percentage: number;
  iconName: 'euro' | 'target' | 'search' | 'file' | 'user' | 'trending-up' | 'pie-chart' | 'bar-chart';
  color: string;
  companyId?: string;
}

export interface StatusCard {
  id: string;
  label: string;
  count: number;
  color: string;
  order?: number;
  companyId?: string;
}

export interface Article {
  id: string;
  metier: string;
  rubrique: string;
  famille: string;
  collection: string;
  descriptif: string;
  prixMiniTTC: number;
  prixMaxiTTC: number;
  companyId: string;
  createdAt: any;
  createdBy: string;
}
