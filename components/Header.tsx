
import React from 'react';
import { MessageSquare, Bell, Settings, ChevronDown, UserCircle } from 'lucide-react';

const LayoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
);

const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
);

interface HeaderProps {
  title: string;
  user: any;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, user, onProfileClick, onSettingsClick }) => {
  const isSettingsPage = title === 'Paramètres';

  const getIcon = () => {
    if (isSettingsPage) return <Settings size={18} className="text-gray-600" />;
    if (title === 'Tableau de bord') return <LayoutIcon />;
    if (title === 'Notre entreprise') return <BriefcaseIcon />;
    if (title === 'Annuaire Clients / Prospects') return <UserCircle size={20} className="text-gray-600" />;
    return <UserCircle size={20} className="text-gray-600" />;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center">
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 mr-4">
           {getIcon()}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>

      <div className="flex items-center space-x-2">
        <button className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all">
          <MessageSquare size={20} />
        </button>
        <button className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl relative transition-all">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-gray-900 rounded-full border border-white"></span>
        </button>
        {user?.role === 'Administrateur.rice' && (
          <button 
            onClick={onSettingsClick}
            className={`p-2.5 rounded-xl transition-all ${
              isSettingsPage 
                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Settings size={20} />
          </button>
        )}

        <div className="h-8 w-px bg-gray-100 mx-2"></div>

        <div 
          onClick={onProfileClick}
          className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded-xl transition-all"
        >
          {user?.avatar && (
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="w-9 h-9 rounded-full object-cover mr-3 border border-gray-100 shadow-sm"
            />
          )}
          <div className="mr-3">
            <div className="text-sm font-bold text-gray-900 leading-tight">{user?.name}</div>
            <div className="text-[11px] text-gray-400 font-medium capitalize">
              {Array.isArray(user?.metier) 
                ? user.metier.join(', ') 
                : (user?.metier || user?.role || 'Collaborateur')}
            </div>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
};

export default Header;
