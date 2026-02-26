
import React, { useEffect, useRef } from 'react';
import { Client } from '../types';

interface DirectoryMapProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
}

const DirectoryMap: React.FC<DirectoryMapProps> = ({ clients, onClientClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current) return;

    // Initialisation de la carte
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([46.603354, 1.888334], 6); // Centré sur la France par défaut

      // Style de carte épuré "Light" (CartoDB Positron)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mapInstanceRef.current);
      
      // Zoom en bas à droite
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Nettoyage des anciens marqueurs
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds: any[] = [];

    // Ajout des nouveaux marqueurs
    clients.forEach((client) => {
      const details = client.details || {};
      if (details.lat && details.lng) {
        const latLng = [details.lat, details.lng];
        bounds.push(latLng);

        const color = client.status === 'Client' ? '#06b6d4' : client.status === 'Prospect' ? '#d946ef' : '#a855f7';
        
        const customIcon = L.divIcon({
          className: 'directory-map-marker',
          html: `
            <div style="background-color: ${color}; width: 14px; height: 14px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(0,0,0,0.15); transition: all 0.2s ease-in-out;"></div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker(latLng, { icon: customIcon }).addTo(map);
        
        // Popup personnalisée
        const popupContent = document.createElement('div');
        popupContent.style.fontFamily = 'Inter, sans-serif';
        popupContent.style.padding = '4px';
        popupContent.innerHTML = `
          <p style="font-size: 10px; font-weight: 800; color: ${color}; text-transform: uppercase; margin-bottom: 2px;">${client.status === 'Leads' ? 'Études' : client.status}</p>
          <h4 style="font-size: 13px; font-weight: 800; color: #111827; margin: 0;">${client.name}</h4>
          <p style="font-size: 11px; color: #6b7280; margin: 4px 0 8px 0;">${client.location || 'Adresse non précisée'}</p>
        `;

        const btn = document.createElement('button');
        btn.innerHTML = 'VOIR LA FICHE';
        btn.style.cssText = 'width: 100%; padding: 8px; background: #111827; color: white; border: none; border-radius: 8px; font-size: 10px; font-weight: 700; cursor: pointer; text-transform: uppercase; transition: all 0.2s;';
        btn.onclick = () => onClientClick(client);
        popupContent.appendChild(btn);

        marker.bindPopup(popupContent, {
          maxWidth: 220,
          className: 'xora-map-popup'
        });

        markersRef.current.push(marker);
      }
    });

    // Ajustement de la vue
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    // CRUCIAL : Force le recalcul de la taille après le rendu initial
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [clients]);

  // Nettoyage complet lors du démontage du composant
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full flex-1 z-0 animate-in fade-in duration-500" 
    />
  );
};

export default DirectoryMap;
