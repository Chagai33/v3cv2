import React from 'react';
import { X, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { GoogleCalendarButton } from '../calendar/GoogleCalendarButton';
import { useTranslation } from 'react-i18next';
import { useGoogleCalendar } from '../../contexts/GoogleCalendarContext';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStrictMode?: boolean;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({ isOpen, onClose, initialStrictMode }) => {
  const { t, i18n } = useTranslation();
  const { isConnected, isPrimaryCalendar } = useGoogleCalendar();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('googleCalendar.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-4 pb-20 sm:pb-4">
          
          {isConnected && isPrimaryCalendar && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-start mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-semibold text-amber-900 text-sm">
                        {t('googleCalendar.setupRequired', 'נדרשת הגדרה')}
                    </p>
                    <p className="text-xs text-amber-800">
                        {t('googleCalendar.primaryCalendarWarning', 'האפליקציה מחוברת כרגע ליומן הראשי. כדי לסנכרן ימי הולדת, עליך ליצור או לבחור יומן ייעודי.')}
                    </p>
                </div>
            </div>
          )}

          <p className="text-sm text-gray-600 text-center">
            {t('googleCalendar.modalDescription')}
          </p>
          <div className="w-full flex justify-center">
             <GoogleCalendarButton initialStrictMode={initialStrictMode} />
          </div>
        </div>
      </div>
      
      {/* כפתור סגירה/חזרה בתחתית המסך במובייל */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 sm:hidden">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-white/90 backdrop-blur-md border border-white/30 text-gray-700 rounded-full shadow-xl hover:bg-white transition-all active:scale-95 ring-1 ring-black/5 flex items-center gap-2"
        >
          {i18n.language === 'he' ? (
            <>
              <span className="text-sm font-medium">{t('common.close', 'סגור')}</span>
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">{t('common.close', 'Close')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

