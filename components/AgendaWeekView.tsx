
import React, { useState } from 'react';
import { Clock, CheckSquare, Calendar, Users, MapPin, Video } from 'lucide-react';
import { Appointment } from '../types';

interface AgendaWeekViewProps {
  currentDate: Date;
  weekDays: any[];
  appointments: Appointment[];
  onAppointmentClick?: (rdv: Appointment) => void;
}

const AgendaWeekView: React.FC<AgendaWeekViewProps> = ({ currentDate, weekDays, appointments, onAppointmentClick }) => {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8);

  const getPositionStyles = (startTime: string, endTime: string) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutesFrom8am = (startH - 8) * 60 + startM;
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const rowHeight = 80; 
    return {
      top: `${(startMinutesFrom8am / 60) * rowHeight}px`,
      height: `${(durationMinutes / 60) * rowHeight}px`
    };
  };

  const getLayoutMap = (dayApps: Appointment[]) => {
    if (dayApps.length === 0) return new Map();
    const sorted = [...dayApps].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const clusters: Appointment[][] = [];
    let currentCluster: Appointment[] = [];
    let clusterEnd = "";
    sorted.forEach(app => {
      if (currentCluster.length > 0 && app.startTime < clusterEnd) {
        currentCluster.push(app);
        if (app.endTime > clusterEnd) clusterEnd = app.endTime;
      } else {
        if (currentCluster.length > 0) clusters.push(currentCluster);
        currentCluster = [app];
        clusterEnd = app.endTime;
      }
    });
    if (currentCluster.length > 0) clusters.push(currentCluster);
    const results = new Map<string, { width: string; left: string }>();
    clusters.forEach(cluster => {
      const columns: string[][] = [];
      cluster.forEach(app => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const hasOverlap = cluster
            .filter(c => columns[i].includes(c.id))
            .some(other => app.startTime < other.endTime && app.endTime > other.startTime);
          if (!hasOverlap) {
            columns[i].push(app.id);
            placed = true;
            break;
          }
        }
        if (!placed) { columns.push([app.id]); }
      });
      const totalCols = columns.length;
      columns.forEach((colIds, colIndex) => {
        colIds.forEach(id => {
          results.set(id, {
            width: `${(100 / totalCols) - 1}%`,
            left: `${(100 / totalCols) * colIndex + 0.5}%`
          });
        });
      });
    });
    return results;
  };

  return (
    <div className="min-w-[1000px] flex flex-col h-full animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex border-b border-gray-100 bg-[#FCFCFD] sticky top-0 z-40">
        <div className="w-20 shrink-0 border-r border-gray-50 flex items-center justify-center">
          <Clock size={16} className="text-gray-200" />
        </div>
        {weekDays.map((day, i) => (
          <div key={i} className={`flex-1 py-5 text-center border-l border-gray-50 ${day.isToday ? 'bg-indigo-50/20' : ''}`}>
            <div className={`text-[10px] font-black uppercase tracking-[0.1em] ${day.isToday ? 'text-indigo-600' : 'text-gray-300'}`}>
              {day.label}
            </div>
            <div className={`text-[14px] font-black mt-1 ${day.isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
              {day.dayNum} {day.month}
            </div>
          </div>
        ))}
      </div>

      <div className="flex relative min-h-[880px] bg-white">
        <div className="w-20 shrink-0 bg-[#FCFCFD]/50 border-r border-gray-50 sticky left-0 z-30">
          {hours.map((hour) => (
            <div key={hour} className="h-20 text-[11px] font-black text-gray-300 text-center pt-2">
              <span className="bg-white px-2 py-0.5 rounded border border-gray-50 shadow-sm">{hour}:00</span>
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 relative">
          <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
            {hours.map((hour) => (
              <div key={hour} className="h-20 border-b border-gray-50/50 w-full"></div>
            ))}
          </div>

          {weekDays.map((day, dayIdx) => {
            const dayApps = appointments.filter(rdv => rdv.date === day.fullDate);
            const layoutMap = getLayoutMap(dayApps);

            return (
              <div key={dayIdx} className={`relative h-full border-l border-gray-50/30 ${day.isToday ? 'bg-indigo-50/5' : ''}`}>
                {dayApps.map(rdv => {
                  const timeStyles = getPositionStyles(rdv.startTime, rdv.endTime);
                  const layoutStyles = layoutMap.get(rdv.id) || { width: '97%', left: '1.5%' };
                  const isTask = !!(rdv as any).taskId;
                  const isLastDays = dayIdx >= 5; // Samedi, Dimanche -> Tooltip à gauche
                  
                  return (
                    <div 
                      key={rdv.id}
                      onClick={() => onAppointmentClick?.(rdv)}
                      className={`group absolute rounded-xl border-l-4 p-2.5 cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:z-50 transition-all z-20 flex flex-col justify-between shadow-md ${isTask ? 'bg-indigo-50 border-indigo-500' : 'bg-[#C6F6D5] border-[#38A169]'}`}
                      style={{ 
                        ...timeStyles, 
                        width: layoutStyles.width, 
                        left: layoutStyles.left 
                      }}
                    >
                      {/* Tooltip au survol - Masqué si privé */}
                      {!rdv.isPrivate && (
                        <div className={`absolute ${isLastDays ? 'right-full mr-4' : 'left-full ml-4'} top-0 w-80 bg-white rounded-[24px] shadow-2xl border border-gray-100 z-[100] p-5 pointer-events-none hidden group-hover:block animate-in fade-in zoom-in-95 duration-200`}>
                          {/* Header */}
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100">
                              <Calendar size={24} />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <h3 className="text-[15px] font-bold text-gray-900 truncate uppercase tracking-tight">{rdv.title}</h3>
                              <div className="flex gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-gray-800 text-white text-[10px] font-black rounded-full uppercase tracking-widest">{rdv.type}</span>
                                {rdv.location === 'Visio' && (
                                  <span className="px-2 py-0.5 bg-gray-800 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                                    <Video size={12} />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Sections */}
                          <div className="space-y-3 text-left">
                            <div className="bg-gray-50 rounded-2xl p-4">
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Informations du rendez-vous</p>
                              <p className="text-[14px] font-bold text-gray-900">
                                {rdv.date} <span className="text-gray-400 ml-2">{rdv.startTime} - {rdv.endTime}</span>
                              </p>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4">
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Participants</p>
                              <div className="flex -space-x-2">
                                {rdv.collaborators?.map((c, i) => (
                                  <img key={i} src={c.avatar} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" title={c.name} alt="" />
                                ))}
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4">
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Lieu du rendez-vous</p>
                              <div className="flex items-start gap-3">
                                <MapPin size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                  <p className="text-[14px] font-bold text-gray-900">{rdv.location}</p>
                                  <p className="text-[12px] text-gray-500 leading-tight mt-0.5">{rdv.address || 'Adresse non renseignée'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className={`text-[11px] font-black leading-tight truncate uppercase tracking-tighter flex-1 ${isTask ? 'text-indigo-900' : 'text-[#22543D]'}`} title={rdv.isPrivate ? 'RDV privé' : rdv.title}>
                            {rdv.isPrivate ? 'RDV privé' : rdv.title}
                          </h4>
                          {isTask && <CheckSquare size={12} className="text-indigo-400 shrink-0 mt-0.5" />}
                        </div>
                        <p className={`text-[9px] font-bold truncate opacity-80 ${isTask ? 'text-indigo-700' : 'text-[#2F855A]'}`}>
                          {rdv.isPrivate ? rdv.collaborators?.[0]?.name : rdv.clientName}
                        </p>
                        {!rdv.isPrivate && <p className={`text-[8px] font-medium truncate opacity-60 ${isTask ? 'text-indigo-600' : 'text-[#38A169]'}`}>{rdv.location}</p>}
                      </div>
                      <div className="flex justify-between items-end mt-1">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {rdv.collaborators?.slice(0, 3).map((c, i) => (
                            <img key={i} src={c.avatar} className="w-4 h-4 rounded-full border border-white shadow-sm" title={c.name} alt="" />
                          ))}
                          {(rdv.collaborators?.length || 0) > 3 && (
                            <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[6px] font-bold text-gray-400 border border-white">
                              +{(rdv.collaborators?.length || 0) - 3}
                            </div>
                          )}
                        </div>
                        <span className={`text-[8px] font-black whitespace-nowrap ${isTask ? 'text-indigo-600' : 'text-[#38A169]'}`}>
                          {rdv.startTime} - {rdv.endTime}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {day.isToday && (
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                    style={{ top: `${((new Date().getHours() - 8) * 60 + new Date().getMinutes()) / 60 * 80}px` }}
                  >
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-1.5 shadow-lg"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgendaWeekView;
