
import React from 'react';
import { format } from 'date-fns';
import { Clock, CheckSquare, Calendar, Video, MapPin } from 'lucide-react';
import { Appointment } from '../types';
import { formatFullName } from '../utils';

interface AgendaDayViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick?: (rdv: Appointment) => void;
}

const AgendaDayView: React.FC<AgendaDayViewProps> = ({ currentDate, appointments, onAppointmentClick }) => {
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 à 18:00
  const dateStr = format(currentDate, 'dd/MM/yyyy');

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

  const dayAppointments = appointments.filter(rdv => rdv.date === dateStr);

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right-4 duration-300">
      <div className="flex border-b border-gray-100 bg-[#FCFCFD] sticky top-0 z-40">
        <div className="w-20 shrink-0 border-r border-gray-50 flex items-center justify-center">
          <Clock size={16} className="text-gray-200" />
        </div>
        <div className="flex-1 py-6 text-center bg-indigo-50/10">
          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
            {currentDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
          </div>
          <div className="text-[18px] font-black text-gray-900 mt-1">
            {currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="flex relative min-h-[880px]">
        <div className="w-20 shrink-0 bg-[#FCFCFD]/50 border-r border-gray-50 sticky left-0 z-30">
          {hours.map((hour) => (
            <div key={hour} className="h-20 text-[11px] font-black text-gray-300 text-center pt-2">
              <span className="bg-white px-2 py-0.5 rounded border border-gray-50 shadow-sm">{hour}:00</span>
            </div>
          ))}
        </div>

        <div className="flex-1 relative bg-white">
          <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
            {hours.map((hour) => (
              <div key={hour} className="h-20 border-b border-gray-50/50 w-full"></div>
            ))}
          </div>

          <div className="relative h-full">
            {dayAppointments.map(rdv => {
              const styles = getPositionStyles(rdv.startTime, rdv.endTime);
              const isTask = !!(rdv as any).taskId;
              
              const colors = rdv.collaborators?.map(c => c.agendaColor || '#6366f1') || ['#6366f1'];
              const mainColor = colors[0];
              const textColor = isTask ? '#312e81' : (colors.length > 1 ? '#111827' : mainColor);
              const borderColor = isTask ? '#6366f1' : mainColor;

              const bubbleStyle: React.CSSProperties = { ...styles };

              if (colors.length > 1) {
                const borderStops = colors.map((c, i) => `${c} ${(i * 100) / colors.length}%, ${c} ${((i + 1) * 100) / colors.length}%`).join(', ');
                const bgStops = colors.map((c, i) => `${c}15 ${(i * 100) / colors.length}%, ${c}15 ${((i + 1) * 100) / colors.length}%`).join(', ');
                bubbleStyle.backgroundImage = `linear-gradient(to bottom, ${borderStops}), linear-gradient(to bottom, ${bgStops})`;
                bubbleStyle.backgroundSize = `6px 100%, 100% 100%`;
                bubbleStyle.backgroundPosition = `left center, center center`;
                bubbleStyle.backgroundRepeat = `no-repeat`;
                bubbleStyle.borderLeftColor = 'transparent';
              } else {
                bubbleStyle.backgroundColor = isTask ? 'rgba(99, 102, 241, 0.05)' : `${mainColor}20`;
                bubbleStyle.borderLeftColor = borderColor;
              }

              return (
                <div 
                  key={rdv.id}
                  onClick={() => onAppointmentClick?.(rdv)}
                  className={`group absolute inset-x-10 rounded-2xl border-l-[6px] p-4 cursor-pointer hover:shadow-2xl hover:scale-[1.01] hover:z-50 transition-all z-20 flex flex-col justify-between shadow-lg`}
                  style={bubbleStyle}
                >
                  {/* Tooltip au survol - Masqué si privé */}
                  {!rdv.isPrivate && (
                    <div className="absolute left-[80%] top-0 w-80 bg-white rounded-[24px] shadow-2xl border border-gray-100 z-[100] p-5 pointer-events-none hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100">
                          <Calendar size={24} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="text-[15px] font-bold text-gray-900 truncate uppercase tracking-tight">{rdv.title}</h3>
                          <div className="flex gap-2 mt-1">
                            <span className="px-2 py-0.5 text-white text-[10px] font-black rounded-full uppercase tracking-widest" style={{ backgroundColor: borderColor }}>{rdv.type}</span>
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

                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-[14px] font-black uppercase tracking-tight`} style={{ color: textColor }}>
                        {rdv.isPrivate ? 'RDV privé' : rdv.title}
                      </h4>
                      <p className={`text-[12px] font-bold mt-1 opacity-80`} style={{ color: textColor }}>
                        {rdv.isPrivate ? formatFullName(rdv.collaborators?.[0]?.name || '') : formatFullName(rdv.clientName)}
                      </p>
                    </div>
                    {isTask && <CheckSquare size={16} className="text-indigo-400 shrink-0" />}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2 overflow-hidden">
                        {rdv.collaborators?.map((c, i) => (
                          <img key={i} src={c.avatar} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" title={c.name} alt="" />
                        ))}
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase`} style={{ backgroundColor: `${borderColor}30`, color: textColor }}>
                        {rdv.type} {!rdv.isPrivate && `• ${rdv.location}`}
                      </span>
                    </div>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg bg-white/50`} style={{ color: textColor }}>{rdv.startTime} - {rdv.endTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgendaDayView;
