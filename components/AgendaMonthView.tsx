
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { CheckSquare, Calendar, Video, MapPin } from 'lucide-react';
import { Appointment } from '../types';

interface AgendaMonthViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick?: (rdv: Appointment) => void;
}

const AgendaMonthView: React.FC<AgendaMonthViewProps> = ({ currentDate, appointments, onAppointmentClick }) => {
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOffset = firstDay.getDay();
    startOffset = startOffset === 0 ? 6 : startOffset - 1;
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ 
        day: prevMonthLastDay - i, 
        currentMonth: false, 
        date: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ 
        day: i, 
        currentMonth: true, 
        date: new Date(year, month, i)
      });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ 
        day: i, 
        currentMonth: false, 
        date: new Date(year, month + 1, i)
      });
    }
    return days;
  }, [currentDate]);

  const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-left-4 duration-300">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-[#FCFCFD]">
        {daysOfWeek.map(d => (
          <div key={d} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-l border-gray-50 first:border-l-0">
            {d}
          </div>
        ))}
      </div>
      
      <div className="flex-1 grid grid-cols-7 grid-rows-6 min-h-[600px]">
        {monthDays.map((dayData, idx) => {
          const fullDateStr = format(dayData.date, 'dd/MM/yyyy');
          const dayAppointments = appointments.filter(rdv => rdv.date === fullDateStr);
          const isToday = fullDateStr === format(new Date(), 'dd/MM/yyyy');

          return (
            <div key={idx} className={`p-2 border-b border-l border-gray-50 flex flex-col gap-1 min-h-[120px] transition-colors hover:bg-gray-50/30 ${dayData.currentMonth ? 'bg-white' : 'bg-[#FBFBFB] opacity-50'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[12px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-900'}`}>
                  {dayData.day}
                </span>
                {dayAppointments.length > 0 && (
                  <span className="text-[9px] font-bold text-gray-300 italic">{dayAppointments.length} RDV</span>
                )}
              </div>
              
              <div className="space-y-1 overflow-hidden">
                {dayAppointments.slice(0, 3).map(rdv => {
                  const isTask = !!(rdv as any).taskId;
                  
                  const colors = rdv.collaborators?.map(c => c.agendaColor || '#6366f1') || ['#6366f1'];
                  const mainColor = colors[0];
                  const textColor = isTask ? '#312e81' : (colors.length > 1 ? '#111827' : mainColor);
                  const borderColor = isTask ? '#6366f1' : mainColor;

                  const bubbleStyle: React.CSSProperties = { color: textColor };

                  if (colors.length > 1) {
                    const borderStops = colors.map((c, i) => `${c} ${(i * 100) / colors.length}%, ${c} ${((i + 1) * 100) / colors.length}%`).join(', ');
                    const bgStops = colors.map((c, i) => `${c}15 ${(i * 100) / colors.length}%, ${c}15 ${((i + 1) * 100) / colors.length}%`).join(', ');
                    bubbleStyle.backgroundImage = `linear-gradient(to bottom, ${borderStops}), linear-gradient(to bottom, ${bgStops})`;
                    bubbleStyle.backgroundSize = `2px 100%, 100% 100%`;
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
                      className={`group relative px-2 py-1 border-l-2 rounded-md text-[9px] font-black truncate uppercase flex items-center justify-between cursor-pointer hover:brightness-95 transition-all`}
                      style={bubbleStyle}
                    >
                      <span className="truncate flex-1">{rdv.startTime}-{rdv.endTime} • {rdv.isPrivate ? 'RDV privé' : rdv.title}</span>
                      {isTask && <CheckSquare size={10} className="text-indigo-400 ml-1 shrink-0" />}

                      {/* Tooltip au survol - Masqué si privé */}
                      {!rdv.isPrivate && (
                        <div className="fixed sm:absolute left-full ml-2 top-0 w-80 bg-white rounded-[24px] shadow-2xl border border-gray-100 z-[100] p-5 pointer-events-none hidden group-hover:block animate-in fade-in zoom-in-95 duration-200 normal-case font-sans">
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
                    </div>
                  );
                })}
                {dayAppointments.length > 3 && (
                  <div className="text-center text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">+ {dayAppointments.length - 3} autres</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgendaMonthView;
