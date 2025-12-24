import React, { useState } from 'react';
import { Plus, Upload, Users, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FloatingDockProps {
  onAdd: () => void;
  onImport: () => void;
  onTextImport: () => void;
  onCalendar: () => void;
  onGroups: () => void;
  hidden?: boolean;
}

const ModernCalendarIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <rect x="112.19" y="146.68" width="287.62" height="293.27" rx="32.24" ry="32.24" style={{fill: '#fff'}}/>
        <path d="M367.57,439.95H144.43c-17.77,0-32.24-14.47-32.24-32.24V178.92h287.62v228.79C399.81,425.48,385.34,439.95,367.57,439.95Z" style={{fill: '#fff'}}/>
        <path d="M112.19,176.92v-20.78c0-17.77,14.47-32.24,32.24-32.24h223.14c17.77,0,32.24,14.47,32.24,32.24v20.78H112.19Z" style={{fill: '#ea4335'}}/>
        <path d="M346.97,123.9h-30.1v24.77c0,5.11-4.15,9.27-9.27,9.27h-1.9c-5.11,0-9.27-4.15-9.27-9.27V123.9h-70.85v24.77c0,5.11-4.15,9.27-9.27,9.27h-1.9c-5.11,0-9.27-4.15-9.27-9.27V123.9h-30.1c-17.77,0-32.24,14.47-32.24,32.24v20.78h236.4v-20.78C379.21,138.37,364.74,123.9,346.97,123.9Z" style={{fill: '#ea4335'}}/>
        <path d="M399.81,259.36H112.19v-82.44h287.62V259.36Z" style={{fill: '#4285f4'}}/>
        <path d="M144.43,439.95h223.14c17.77,0,32.24-14.47-32.24-32.24V259.36H112.19v148.36C112.19,425.48,126.66,439.95,144.43,439.95Z" style={{fill: '#fff'}}/>
        <path d="M216.27,338.34l-28.36,28.36l-13.49-13.49c-3.06-3.06-8.01-3.06-11.07,0l-5.19,5.19c-3.06,3.06-3.06,8.01,0,11.07l21.72,21.72c3.06,3.06,8.01,3.06,11.07,0l36.59-36.59c3.06-3.06,3.06-8.01,0-11.07l-5.19-5.19C224.28,335.29,219.33,335.29,216.27,338.34Z" style={{fill: '#34a853'}}/>
        <path d="M350.47,148.67c0,5.11-4.15,9.27-9.27,9.27h-1.9c-5.11,0-9.27-4.15-9.27-9.27V105.13c0-5.11,4.15-9.27,9.27-9.27h1.9c5.11,0,9.27,4.15,9.27,9.27V148.67Z" style={{fill: '#34a853'}}/>
        <path d="M239.54,148.67c0,5.11-4.15,9.27-9.27,9.27h-1.9c-5.11,0-9.27-4.15-9.27-9.27V105.13c0-5.11,4.15-9.27,9.27-9.27h1.9c5.11,0,9.27,4.15,9.27,9.27V148.67Z" style={{fill: '#34a853'}}/>
        <rect x="112.19" y="176.92" width="287.62" height="16.18" style={{fill: '#3e2723', opacity: 0.1}}/>
    </svg>
);


export const FloatingDock: React.FC<FloatingDockProps> = ({
  onAdd,
  onImport,
  onTextImport,
  onCalendar,
  onGroups,
  hidden = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Order: Add (Bottom), Import, Text Import, Calendar, Groups (Top)
  const menuItems = [
    { 
        id: 'add',
        icon: Plus, 
        label: t('birthday.addBirthday'), 
        onClick: onAdd, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
    },
    { 
        id: 'import',
        icon: Upload, 
        label: t('birthday.importCSV'), 
        onClick: onImport, 
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
    },
    { 
        id: 'calendar',
        icon: ModernCalendarIcon,
        label: t('googleCalendar.connect'), 
        onClick: onCalendar, 
        color: '',
        bgColor: 'bg-white',
        borderColor: 'border-gray-200',
        isCustomIcon: true
    },
    { 
        id: 'textImport',
        icon: FileText, 
        label: t('birthday.pasteImport'), 
        onClick: onTextImport, 
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
    },
    { 
        id: 'groups',
        icon: Users, 
        label: t('groups.manageGroups'), 
        onClick: onGroups, 
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
    }
  ];

  if (hidden) {
    return null;
  }

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
        {/* Backdrop to close menu when clicking outside */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-30 sm:hidden"
                onClick={() => setIsOpen(false)}
            />
        )}

        <div className="fixed bottom-6 left-6 z-40 sm:hidden flex flex-col-reverse items-center gap-4">
        {/* Main Toggle Button */}
        <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-4 rounded-full shadow-xl transition-all duration-300 z-40 border 
            ${isOpen 
                ? 'bg-white text-gray-600 rotate-45 border-gray-200 ring-0' 
                : 'bg-white text-blue-600 border-blue-200 ring-2 ring-blue-100 hover:bg-blue-50'
            }
            `}
            aria-label={isOpen ? t('common.close') : t('common.actions')}
        >
            {isOpen ? (
                <Plus className="w-6 h-6" /> 
            ) : (
                <Plus className="w-6 h-6 stroke-[2.5]" />
            )}
        </button>

        {/* Menu Items */}
        <div 
            className={`flex flex-col-reverse gap-3 absolute bottom-full mb-6 transition-all duration-200 
            ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
            style={{ paddingBottom: '1rem', left: '0.5rem' }}
        >
            {menuItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 group w-max">
                 {/* Icon Button */}
                <button
                    onClick={() => handleAction(item.onClick)}
                    className={`p-3 rounded-full shadow-lg border transition-all duration-200 hover:scale-110 active:scale-95 backdrop-blur-md bg-white/90 border-white/50`}
                    aria-label={item.label}
                >
                    {item.isCustomIcon ? (
                        <item.icon className="w-5 h-5" />
                    ) : (
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                    )}
                </button>

                {/* Label - Clickable */}
                <button
                    onClick={() => handleAction(item.onClick)} 
                    className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-white/40 text-sm font-medium text-gray-800 whitespace-nowrap hover:bg-white/95 transition-colors cursor-pointer text-left"
                >
                    {item.label}
                </button>
            </div>
            ))}
        </div>
        </div>
    </>
  );
};
