import React, { useState, useEffect } from 'react';
import { Plus, Upload, PenLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLayoutContext } from '../../contexts/LayoutContext';

export const FloatingActionButton: React.FC = () => {
  const { t } = useTranslation();
  const { triggerAction } = useLayoutContext();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(true);

  // Stop pulse animation after first interaction or after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldPulse(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleMainClick = () => {
    setShouldPulse(false);
    setIsOpen(!isOpen);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 sm:hidden flex flex-col-reverse items-center gap-3">
      {/* Main FAB */}
      <button
        onClick={handleMainClick}
        className={`p-4 rounded-full shadow-xl text-white transition-all duration-300 z-50 
          ${isOpen ? 'bg-gray-700 rotate-45' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'}
          ${shouldPulse ? 'animate-pulse-ring' : ''}
        `}
        aria-label={isOpen ? t('common.close') : t('common.actions')}
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Speed Dial Actions */}
      <div className={`flex flex-col-reverse gap-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 pointer-events-none'}`}>
        
        {/* Import Action */}
        <div className="flex items-center gap-3 group">
          <span className="bg-white px-3 py-1 rounded-lg shadow-md text-sm font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute left-16 whitespace-nowrap pointer-events-none">
            {t('birthday.importCSV')}
          </span>
          <button
            onClick={() => handleAction(() => triggerAction('OPEN_IMPORT'))}
            className="p-3 bg-white text-emerald-600 rounded-full shadow-lg border border-emerald-100 hover:bg-emerald-50 transition-colors"
            aria-label={t('birthday.importCSV')}
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>

        {/* Add Birthday Action */}
        <div className="flex items-center gap-3 group">
           <span className="bg-white px-3 py-1 rounded-lg shadow-md text-sm font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute left-16 whitespace-nowrap pointer-events-none">
            {t('birthday.addBirthday')}
          </span>
          <button
            onClick={() => handleAction(() => triggerAction('OPEN_ADD_BIRTHDAY'))}
            className="p-3 bg-white text-blue-600 rounded-full shadow-lg border border-blue-100 hover:bg-blue-50 transition-colors"
            aria-label={t('birthday.addBirthday')}
          >
            <PenLine className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};


