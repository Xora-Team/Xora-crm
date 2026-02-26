
import React, { useMemo } from 'react';
import { CheckSquare } from 'lucide-react';
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
          const fullDateStr = dayData.date.toLocaleDateString('fr-FR');
          const dayAppointments = appointments.filter(rdv => rdv.date === fullDateStr);
          const isToday = fullDateStr === new Date().toLocaleDateString('fr-FR');

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
                  return (
                    <div 
                      key={rdv.id} 
                      onClick={() => onAppointmentClick?.(rdv)}
                      className={`px-2 py-1 border-l-2 rounded-md text-[9px] font-black truncate uppercase flex items-center justify-between cursor-pointer hover:brightness-95 transition-all ${isTask ? 'bg-indigo-50 border-indigo-500 text-indigo-900' : 'bg-[#C6F6D5] border-[#38A169] text-[#22543D]'}`}
                    >
                      <span className="truncate flex-1">{rdv.startTime} • {rdv.title}</span>
                      {isTask && <CheckSquare size={10} className="text-indigo-400 ml-1 shrink-0" />}
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
