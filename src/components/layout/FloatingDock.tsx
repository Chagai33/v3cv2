import React from 'react';
import { Plus, Upload, Calendar, Users, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLayoutContext } from '../../contexts/LayoutContext';

interface FloatingDockProps {
  onAdd: () => void;
  onImport: () => void;
  onCalendar: () => void;
  onGroups: () => void;
  hidden?: boolean;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  onAdd,
  onImport,
  onCalendar,
  onGroups,
  hidden = false,
}) => {
  const { t } = useTranslation();
  const { openAboutModal } = useLayoutContext();

  const dockItems = [
    { icon: Plus, label: t('birthday.addBirthday'), onClick: onAdd, color: 'text-blue-600' },
    { icon: Upload, label: t('birthday.importCSV'), onClick: onImport, color: 'text-green-600' },
    { icon: Calendar, label: t('googleCalendar.title'), onClick: onCalendar, color: 'text-purple-600' },
    { icon: Users, label: t('groups.title'), onClick: onGroups, color: 'text-orange-600' },
    { icon: Info, label: t('common.about', 'About'), onClick: openAboutModal, color: 'text-gray-600' },
  ];

  if (hidden) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 sm:hidden">
      <div 
        className="flex items-center gap-1 px-2 py-2 backdrop-blur-md border border-white/30 rounded-full shadow-xl shadow-blue-900/5 ring-1 ring-black/5"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
      >
        {dockItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className="group relative p-3 rounded-full hover:bg-white/40 transition-all duration-200 active:scale-95"
            aria-label={item.label}
          >
            <item.icon className={`w-6 h-6 ${item.color}`} />
            
            {/* Tooltip */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
