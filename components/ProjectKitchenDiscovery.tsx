
import React, { useState } from 'react';
import ProjectKitchenAmbiance from './ProjectKitchenAmbiance';
import ProjectKitchenElectros from './ProjectKitchenElectros';
import ProjectKitchenFurniture from './ProjectKitchenFurniture';
import ProjectKitchenEstimation from './ProjectKitchenEstimation';

interface ProjectKitchenDiscoveryProps {
  project: any;
  userProfile: any;
}

const ProjectKitchenDiscovery: React.FC<ProjectKitchenDiscoveryProps> = ({ project, userProfile }) => {
  const [activeKitchenTab, setActiveKitchenTab] = useState('Ambiance');

  const kitchenTabs = [
    { id: 'Ambiance', label: 'Ambiance' },
    { id: 'Meubles', label: 'Meubles' },
    { id: 'Electros & sanitaires', label: 'Electros & sanitaires' },
    { id: 'Estimation financière', label: 'Estimation financière' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#f0f2f5] p-1.5 rounded-full flex gap-1 w-full shadow-inner border border-gray-100">
        {kitchenTabs.map((kt) => {
          const isActive = activeKitchenTab === kt.id;
          return (
            <button
              key={kt.id}
              onClick={() => setActiveKitchenTab(kt.id)}
              className={`flex-1 px-8 py-3 rounded-full text-[13px] font-bold transition-all flex items-center justify-center ${
                isActive 
                ? 'bg-white text-gray-900 shadow-sm border border-gray-100' 
                : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {kt.label}
            </button>
          );
        })}
      </div>

      <div className="animate-in fade-in duration-300">
        {activeKitchenTab === 'Ambiance' && <ProjectKitchenAmbiance project={project} />}
        {activeKitchenTab === 'Meubles' && <ProjectKitchenFurniture project={project} />}
        {activeKitchenTab === 'Electros & sanitaires' && <ProjectKitchenElectros project={project} userProfile={userProfile} />}
        {activeKitchenTab === 'Estimation financière' && <ProjectKitchenEstimation project={project} />}
      </div>
    </div>
  );
};

export default ProjectKitchenDiscovery;
