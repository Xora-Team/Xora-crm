
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
}

const Header: React.FC<HeaderProps> = ({ title, user, onProfileClick }) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center">
        <div className="p-2 bg-gray-50 rounded-md border border-gray-200 mr-4">
           {title === 'Tableau de bord' ? <LayoutIcon /> : <BookIcon />}
        </div>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors">
          <MessageSquare size={18} />
        </button>
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md border border-gray-200 relative transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-gray-800 rounded-full border border-white"></span>
        </button>
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors">
          <Settings size={18} />
        </button>

        <div className="h-8 w-px bg-gray-200 mx-2"></div>

        <div 
          onClick={onProfileClick}
          className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded-md transition-all"
        >
          <img 
            src={user?.avatar || "https://i.pravatar.cc/150?u=fallback"} 
            alt={user?.name} 
            className="w-9 h-9 rounded-full object-cover mr-3 border border-gray-100 shadow-sm"
          />
          <div className="mr-2">
            <div className="text-sm font-bold text-gray-800 leading-tight">{user?.name}</div>
            <div className="text-xs text-gray-500 capitalize">{user?.role || 'Membre'}</div>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
};

export default Header;
