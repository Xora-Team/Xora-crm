
import React from 'react';
import { MessageSquare, Bell, Settings, ChevronDown } from 'lucide-react';

const LayoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
);

const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
);

interface HeaderProps {
  title: string;
  user: any;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, user, onProfileClick, onSettingsClick }) => {
  const isSettingsPage = title === 'Paramètres';

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center">
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 mr-4">
           {isSettingsPage ? <Settings size={18} className="text-gray-600" /> : (title === 'Tableau de bord' ? <LayoutIcon /> : <BookIcon />)}
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

        <div className="h-8 w-px bg-gray-100 mx-2"></div>

        <div 
          onClick={onProfileClick}
          className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded-xl transition-all"
        >
          <img 
            src={user?.avatar || "https://i.pravatar.cc/150?u=fallback"} 
            alt={user?.name} 
            className="w-9 h-9 rounded-full object-cover mr-3 border border-gray-100 shadow-sm"
          />
          <div className="mr-3">
            <div className="text-sm font-bold text-gray-900 leading-tight">{user?.name}</div>
            <div className="text-[11px] text-gray-400 font-medium capitalize">{user?.role || 'Membre'}</div>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
};

export default Header;
