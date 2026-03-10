
import { Client, FinancialKPI, StatusCard, Task, Article } from './types';

export const FINANCIAL_KPIS: FinancialKPI[] = [
  { id: 'ca', label: 'CA Généré', value: '53.456€', target: '110.000€', percentage: 65, iconName: 'euro', color: 'purple' },
  { id: 'marge', label: 'Marge générée', value: '12.326€', target: '15.000€', percentage: 73, iconName: 'search', color: 'purple' },
  { id: 'taux_marge', label: 'Taux de marge', value: '23,4%', target: '35%', percentage: 68, iconName: 'file', color: 'purple' },
  { id: 'taux_transfo', label: 'Taux de transformation', value: '32,2%', target: '33%', percentage: 96, iconName: 'user', color: 'purple' },
];

export const STATUS_CARDS: StatusCard[] = [
  { id: 'leads', label: 'Leads', count: 8, color: 'purple' },
  { id: 'etudes', label: 'Etudes en cours', count: 8, color: 'fuchsia' },
  { id: 'commandes', label: 'Commandes clients', count: 8, color: 'blue' },
  { id: 'dossiers', label: 'Dossiers tech & install', count: 10, color: 'cyan' },
  { id: 'sav', label: 'SAV', count: 7, color: 'orange' },
];

export const TASKS: Task[] = [
  {
    id: '1',
    title: 'Coline Farget - Projet cuisine',
    tag: 'Dossier technique',
    tagColor: 'blue',
    date: '2 jours de retard',
    progress: 45,
    status: 'in-progress',
    statusType: 'progress',
    isLate: true,
    type: 'Tâche auto',
    collaborator: { name: 'Jérémy', avatar: 'https://i.pravatar.cc/150?u=1' },
  },
  {
    id: '2',
    title: 'John Dubois - Projet salle de bain',
    tag: 'Appel',
    tagColor: 'gray',
    date: '20/08/2025',
    status: 'pending',
    statusType: 'toggle',
    type: 'Tâche manuelle',
    collaborator: { name: 'Céline', avatar: 'https://i.pravatar.cc/150?u=2' },
  },
  {
    id: '3',
    title: 'Alexandre Lacours - Cuisine exterieur',
    tag: 'Etudes en cours',
    tagColor: 'purple',
    date: '21/08/2025',
    progress: 45,
    status: 'in-progress',
    statusType: 'progress',
    isLate: true,
    type: 'Tâche auto',
    collaborator: { name: 'Jérémy', avatar: 'https://i.pravatar.cc/150?u=1' },
  },
  {
    id: '4',
    title: 'Coline Farget - Projet salle de bain',
    tag: 'Email',
    tagColor: 'gray',
    date: '3 jours de retard',
    status: 'pending',
    statusType: 'toggle',
    isLate: true,
    type: 'Tâche manuelle',
    collaborator: { name: 'Jérémy', avatar: 'https://i.pravatar.cc/150?u=1' },
  },
  {
    id: '5',
    title: 'Appeler Bernard',
    tag: 'Mémo',
    tagColor: 'gray',
    date: '19/08/2025',
    status: 'pending',
    statusType: 'toggle',
    type: 'Mémo',
    collaborator: { name: 'Loïc', avatar: 'https://i.pravatar.cc/150?u=loic' },
  },
];

export const CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Chloé DUBOIS',
    addedBy: { name: 'Jérémy', avatar: 'https://i.pravatar.cc/150?u=1' },
    origin: 'Relation',
    location: 'Valras-Plage',
    projectCount: 2,
    status: 'Prospect',
    dateAdded: '25/05/25',
  },
  {
    id: '2',
    name: 'Julien MOREAU',
    addedBy: { name: 'Thomas', avatar: 'https://i.pravatar.cc/150?u=admin' },
    origin: 'Web',
    location: 'Béziers',
    projectCount: 1,
    status: 'Leads',
    dateAdded: '12/06/25',
  },
  {
    id: '3',
    name: 'Amélie BERNARD',
    addedBy: { name: 'Céline', avatar: 'https://i.pravatar.cc/150?u=2' },
    origin: 'Apporteur',
    location: 'Montpellier',
    projectCount: 3,
    status: 'Client',
    dateAdded: '10/04/25',
  },
  {
    id: '4',
    name: 'Nicolas PETIT',
    addedBy: { name: 'Jérémy', avatar: 'https://i.pravatar.cc/150?u=1' },
    origin: 'Relation',
    location: 'Agde',
    projectCount: 0,
    status: 'Prospect',
    dateAdded: '02/07/25',
  },
  {
    id: '5',
    name: 'Sophie MARTIN',
    addedBy: { name: 'Thomas', avatar: 'https://i.pravatar.cc/150?u=admin' },
    origin: 'Web',
    location: 'Sète',
    projectCount: 2,
    status: 'Client',
    dateAdded: '15/03/25',
  },
  {
    id: '6',
    name: 'Luc DURAND',
    addedBy: { name: 'Céline', avatar: 'https://i.pravatar.cc/150?u=2' },
    origin: 'Relation',
    location: 'Narbonne',
    projectCount: 1,
    status: 'Leads',
    dateAdded: '22/08/25',
  },
  {
    id: '7',
    name: 'Emma LEFEBVRE',
    addedBy: { name: 'Jérémy', avatar: 'https://i.pravatar.cc/150?u=1' },
    origin: 'Apporteur',
    location: 'Pézenas',
    projectCount: 4,
    status: 'Client',
    dateAdded: '30/01/25',
  },
  {
    id: '8',
    name: 'Thomas ROUX',
    addedBy: { name: 'Thomas', avatar: 'https://i.pravatar.cc/150?u=admin' },
    origin: 'Web',
    location: 'Cap d\'Agde',
    projectCount: 0,
    status: 'Prospect',
    dateAdded: '18/09/25',
  },
  {
    id: '9',
    name: 'Marie GARCIA',
    addedBy: { name: 'Céline', avatar: 'https://i.pravatar.cc/150?u=2' },
    origin: 'Relation',
    location: 'Mèze',
    projectCount: 2,
    status: 'Leads',
    dateAdded: '05/11/25',
  },
  {
    id: '10',
    name: 'Antoine MICHEL',
    addedBy: { name: 'Jérémy', avatar: 'https://i.pravatar.cc/150?u=1' },
    origin: 'Web',
    location: 'Loupian',
    projectCount: 1,
    status: 'Prospect',
    dateAdded: '14/10/25',
  },
  {
    id: '11',
    name: 'Camille RENARD',
    addedBy: { name: 'Thomas', avatar: 'https://i.pravatar.cc/150?u=admin' },
    origin: 'Apporteur',
    location: 'Gigean',
    projectCount: 0,
    status: 'Leads',
    dateAdded: '21/12/25',
  }
];

export const ARTICLES: Article[] = [];

export const HIERARCHY_DATA: Record<string, Record<string, string[]>> = {
  "Prospection": {
    "terrain": ["voisin", "porte-à porte", "Tour de chantier"],
    "téléphonique": ["Appel froid"]
  },
  "Parrainage": {
    "Spontané": [],
    "Bon de parrainage": []
  },
  "Prescripteur": {
    "Architecte": [],
    "Artisan": [],
    "Courtier": [],
    "Décorateur": [],
    "Boutiques voisines": [],
    "Fournisseur": []
  },
  "Anciens clients": {
    "Général": []
  },
  "Notoriété entreprise": {
    "Général": []
  },
  "Digital": {
    "Réseaux sociaux": ["Facebook", "Instagram", "Linkedin", "Tik-tok", "YouTube", "Pinterest"],
    "Pub digitales": ["Google Ads", "Facebook Ads", "Instagram Ads"],
    "Web": ["Recherche Google", "Google maps", "Waze", "Avis Google", "Avis en lignes divers", "Pages jaunes", "Forum"],
    "IA": ["ChatGPT", "Gemini", "Claude", "Mistral"],
    "Site web entreprise": ["Formulaire contact", "Prise de rdv en ligne", "Chatbot"]
  },
  "Marketing": {
    "Emailing": ["Newsletter", "Email promo"],
    "SMS marketing": [],
    "Affichage": ["4x3", "Abribus", "Panneau chantier", "Véhicule floqué"],
    "Magazine": [],
    "Journal gratuit": [],
    "Publication pro": [],
    "Radio": [],
    "Pages jaunes": [],
    "Evenementiel": ["Salon", "Foire", "Galerie commerciale"],
    "Evènements showroom": ["Portes ouvertes", "Innauguration", "Anniversaire", "Démo culinaires", "Autres"]
  },
  "Réseaux pro": {
    "BNI": [],
    "Club entrepreneurs": ["Club 1", "Club 2", "Club 3", "Club 4"],
    "Groupements métiers": []
  },
  "Passage devant showroom": {
    "Spontané": [],
    "Promo vitrine": [],
    "PLV": []
  },
  "Cercle proche": {
    "Famille": [],
    "Amis": []
  },
  "Autres": {
    "Autre": []
  }
};

export const SUPPLIER_HIERARCHY: Record<string, Record<string, string[]>> = {
  "Achat marchandises": {
    "Cuisine": ["Électroménager", "Évier", "Meuble de cuisine", "Plan de travail", "Accessoires cuisines", "Robinetterie cuisine"],
    "Salle de bain": ["Meuble de salle de bain", "Paroi", "Baignoire", "Robinetterie", "Sanitaire"],
    "Aménagement extérieur": ["Brasero", "Cuisine extérieure"],
    "Revêtement": ["Carrelage", "Parquet", "Stratifié", "Revêtement sol souple", "Peinture", "Béton Ciré", "Accessoires Peintures", "Toiles tendus"],
    "Menuiserie": ["Fenêtres", "Porte d'entrée", "Porte de garage", "Volets", "Pergolas - Carport", "Portail", "Clôtures", "Moustiquaire", "Store banne", "Store Intérieur", "Porte Intérieure", "Porte Placard", "Dressing / Placard", "Quincaillerie", "Miroiterie", "Garde Corps", "Motorisation"],
    "Mobilier": ["Canapé", "Meuble salon", "Table et chaise", "Mobilier bureau", "Accessoires salon", "Literie", "Luminaire"],
    "Transport": ["cuisine", "revêtement", "menuiserie"]
  },
  "Sous traitant": {
    "Cuisine": [],
    "Menuiserie": [],
    "Salle de bain": []
  },
  "Frais généraux": {
    "Général": ["Assurances", "Eau/edf", "Location matériel", "Location Véhicule", "Marketing", "Informatique", "Fournitures", "Entretien", "Téléphonie", "Loyer local"]
  },
  "Institutionnel": {
    "Général": ["Avocat", "Banque", "Comptable", "Formation", "Impôt", "Juridique", "Mutuelle", "Social"]
  }
};
