
import React from 'react';
import { Clock, CheckSquare } from 'lucide-react';
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
                  
                  return (
                    <div 
                      key={rdv.id}
                      onClick={() => onAppointmentClick?.(rdv)}
                      className={`absolute rounded-xl border-l-4 p-2.5 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all z-20 overflow-hidden flex flex-col justify-between shadow-md ${isTask ? 'bg-indigo-50 border-indigo-500' : 'bg-[#C6F6D5] border-[#38A169]'}`}
                      style={{ 
                        ...timeStyles, 
                        width: layoutStyles.width, 
                        left: layoutStyles.left 
                      }}
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className={`text-[11px] font-black leading-tight truncate uppercase tracking-tighter flex-1 ${isTask ? 'text-indigo-900' : 'text-[#22543D]'}`} title={rdv.title}>
                            {rdv.title}
                          </h4>
                          {isTask && <CheckSquare size={12} className="text-indigo-400 shrink-0 mt-0.5" />}
                        </div>
                        <p className={`text-[9px] font-bold truncate opacity-80 ${isTask ? 'text-indigo-700' : 'text-[#2F855A]'}`}>{rdv.clientName}</p>
                      </div>
                      <div className="flex justify-between items-end mt-1">
                        <span className={`text-[8px] font-black px-1 py-0.5 rounded uppercase truncate max-w-[50%] ${isTask ? 'bg-indigo-200/50 text-indigo-800' : 'bg-white/40 text-[#22543D]'}`}>
                          {rdv.type}
                        </span>
                        <span className={`text-[8px] font-black whitespace-nowrap ${isTask ? 'text-indigo-600' : 'text-[#38A169]'}`}>
                          {rdv.startTime}
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
