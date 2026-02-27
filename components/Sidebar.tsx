
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Book, 
  Briefcase, 
  Box, 
  Calendar, 
  BarChart2, 
  LogOut, 
  ChevronsLeft,
  ChevronDown,
  UserCircle,
  Truck,
  Hammer,
  Stamp,
  Users
} from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  setCurrentPage, 
  onLogout,
  isCollapsed,
  setIsCollapsed
}) => {
  const [isAnnuaireOpen, setIsAnnuaireOpen] = useState(true);
  const LOGO_URL = "https://framerusercontent.com/images/BrlQcPpho2hjJ0qjdKGIdbfXY.png?width=1024&height=276";

  const isActive = (pageName: string) => currentPage === pageName;

  const annuaireSubItems = [
    { id: 'directory', label: 'Client / Prospect', icon: UserCircle, page: 'directory' as Page },
    { id: 'suppliers', label: 'Fiche fournisseurs', icon: Truck, page: 'suppliers' as Page },
    { id: 'artisans', label: 'Fiche artisans', icon: Hammer, page: 'artisans' as Page },
    { id: 'prescriber', label: 'Fiche prescripteur', icon: Stamp, page: 'prescriber' as Page },
  ];

  return (
    <div className={`${isCollapsed ? 'w-24' : 'w-72'} h-screen bg-white border-r border-gray-100 flex flex-col font-sans text-gray-600 transition-all duration-300 ease-in-out z-50 shrink-0 shadow-sm overflow-hidden`}>
      
      {/* Header Logo & Collapse Toggle */}
      <div className={`p-6 pb-10 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <img src={LOGO_URL} className="h-8 w-auto animate-in fade-in duration-500" alt="Xora Logo" />
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 hover:bg-gray-100 rounded-xl transition-all duration-300 text-gray-400 hover:text-gray-900 ${isCollapsed ? 'rotate-180' : ''}`}
        >
          <ChevronsLeft size={22} />
        </button>
      </div>

      {/* Main Menu Scrollable Area */}
      <div className="flex-1 px-4 space-y-4 overflow-y-auto hide-scrollbar">
        
        {/* Navigation Section */}
        <div className="space-y-1.5">
          {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3 animate-in fade-in">Principal</p>}
          
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3.5 rounded-2xl transition-all duration-200 group relative ${
              isActive('dashboard') 
                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard size={22} className={`${isCollapsed ? 'm-0' : 'mr-4'} ${isActive('dashboard') ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}`} />
            {!isCollapsed && <span className="text-[15px] font-bold whitespace-nowrap">Tableau de bord</span>}
          </button>

          <button
            onClick={() => setCurrentPage('tasks')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3.5 rounded-2xl transition-all duration-200 group relative ${
              isActive('tasks') 
                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900'
            }`}
          >
            <CheckSquare size={22} className={`${isCollapsed ? 'm-0' : 'mr-4'} ${isActive('tasks') ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}`} />
            {!isCollapsed && <span className="text-[15px] font-bold whitespace-nowrap">Tâches & mémo</span>}
          </button>

          {/* Annuaire Group */}
          <div className="space-y-1">
            <button
              onClick={() => !isCollapsed && setIsAnnuaireOpen(!isAnnuaireOpen)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3.5 rounded-2xl transition-all duration-200 group relative ${
                isActive('directory') || isActive('suppliers') || isActive('artisans') || isActive('prescriber')
                  ? 'text-gray-900 font-bold' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Book size={22} className={`${isCollapsed ? 'm-0' : 'mr-4'} ${isActive('directory') ? 'text-gray-900' : 'text-gray-400'}`} />
              {!isCollapsed && (
                <>
                  <span className="text-[15px] font-bold whitespace-nowrap flex-1 text-left">Annuaire</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isAnnuaireOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {!isCollapsed && isAnnuaireOpen && (
              <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-300">
                {annuaireSubItems.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setCurrentPage(sub.page)}
                    className={`w-full flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                      isActive(sub.page) 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                    }`}
                  >
                    <sub.icon size={18} className={`mr-3 ${isActive(sub.page) ? 'text-gray-900' : 'text-gray-300 group-hover:text-gray-400'}`} />
                    <span className="text-[13px] font-bold">{sub.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Administration Section */}
        <div className="space-y-1.5">
          {!isCollapsed && <p className="px-3 text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3 animate-in fade-in">Gestion</p>}
          {[
            { id: 'projects', label: 'Suivi projets', icon: Briefcase, page: 'projects' as Page },
            { id: 'articles', label: 'Articles', icon: Box, page: 'articles' as Page },
            { id: 'agenda', label: 'Agenda', icon: Calendar, page: 'agenda' as Page },
            { id: 'kpi', label: 'KPI', icon: BarChart2, page: 'kpi' as Page },
            { id: 'company', label: 'Notre entreprise', icon: Briefcase, page: 'company' as Page },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.page)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3.5 rounded-2xl transition-all duration-200 group relative ${
                isActive(item.page)
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                  : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900'
              }`}
            >
              <item.icon 
                size={22} 
                className={`${isCollapsed ? 'm-0' : 'mr-4'} ${isActive(item.page) ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}`} 
              />
              {!isCollapsed && <span className="text-[15px] font-bold whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 mt-auto border-t border-gray-50">
        <button 
          onClick={onLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group overflow-hidden`}
        >
          {!isCollapsed && <span className="text-[15px] font-bold whitespace-nowrap">Se déconnecter</span>}
          <div className={`flex items-center justify-center ${isCollapsed ? '' : 'ml-auto'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 rotate-180"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
