
import React, { useState } from 'react';
import ClientContactGeneral from './ClientContactGeneral';
import ClientExternalContact from './ClientExternalContact';
import ClientPropertyInfo from './ClientPropertyInfo';
import { Client } from '../types';

interface ClientContactInfoProps {
  client: Client;
  userProfile: any;
}

const ClientContactInfo: React.FC<ClientContactInfoProps> = ({ client, userProfile }) => {
  const [activeSubTab, setActiveSubTab] = useState('Infos client');
  const subTabs = ['Infos client', 'Contact externe', 'Infos des biens'];

  const renderSubTab = () => {
    switch (activeSubTab) {
      case 'Infos client': return <ClientContactGeneral client={client} userProfile={userProfile} />;
      case 'Contact externe': return <ClientExternalContact client={client} />;
      case 'Infos des biens': return <ClientPropertyInfo client={client} />;
      default: return <ClientContactGeneral client={client} userProfile={userProfile} />;
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="sticky top-0 bg-white z-20 px-2 border-b border-gray-100 flex gap-12 shrink-0 pt-1 mb-6">
        {subTabs.map((sub) => (
          <button 
            key={sub}
            onClick={() => setActiveSubTab(sub)}
            className={`py-3.5 text-[14px] font-bold transition-all relative ${
              activeSubTab === sub 
              ? 'text-gray-900' 
              : 'text-gray-300 hover:text-gray-500'
            }`}
          >
            {sub}
            {activeSubTab === sub && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-t-full animate-in slide-in-from-bottom-1" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {renderSubTab()}
      </div>
    </div>
  );
};

export default ClientContactInfo;
