import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Calendar, CalendarDays } from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';

interface WhatsAppCopyButtonProps {
  onCopy: () => void;
  onQuickCopy: (format: 'hebrew' | 'gregorian' | 'both') => void;
  isCopied: boolean;
  includeWeekday: boolean;
  onIncludeWeekdayChange: (value: boolean) => void;
}

export const WhatsAppCopyButton: React.FC<WhatsAppCopyButtonProps> = ({
  onCopy,
  onQuickCopy,
  isCopied,
  includeWeekday,
  onIncludeWeekdayChange,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleQuickCopy = (format: 'hebrew' | 'gregorian' | 'both') => {
    onQuickCopy(format);
    setIsOpen(false);
    // Track WhatsApp share
    analyticsService.trackEvent('Share', 'Share_Greeting', format);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className={`flex items-center border shadow-sm rounded-lg transition-all ${
          isCopied 
            ? 'bg-green-100 border-green-300 text-green-700' 
            : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
        }`}
      >
        <button
          onClick={onCopy}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium flex items-center gap-1 rounded-r-lg"
          title={t('common.copyToWhatsappList', 'העתק רשימת ימי הולדת לוואטסאפ')}
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          )}
          <span className="hidden sm:inline">{isCopied ? t('common.copied', 'הועתק!') : t('common.copyToWhatsapp', 'העתק לוואטסאפ')}</span>
        </button>

        {!isCopied && (
          <>
            <div className="w-px h-4 bg-green-200/50"></div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="px-1.5 py-1.5 rounded-l-lg hover:bg-green-100/50"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-[200px]">
          <div className="space-y-1">
            <button
              onClick={() => handleQuickCopy('hebrew')}
              className="w-full text-right px-3 py-2 text-sm hover:bg-purple-50 rounded flex items-center gap-2 transition-colors"
            >
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>{t('birthday.hebrewDates', 'תאריכים עבריים')}</span>
            </button>
            
            <button
              onClick={() => handleQuickCopy('gregorian')}
              className="w-full text-right px-3 py-2 text-sm hover:bg-blue-50 rounded flex items-center gap-2 transition-colors"
            >
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>{t('birthday.gregorianDates', 'תאריכים לועזיים')}</span>
            </button>
            
            <button
              onClick={() => handleQuickCopy('both')}
              className="w-full text-right px-3 py-2 text-sm hover:bg-indigo-50 rounded flex items-center gap-2 transition-colors"
            >
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              <span>{t('birthday.bothTypes', 'שני הסוגים')}</span>
            </button>
            
            <div className="border-t border-gray-200 my-1"></div>
            
            {/* Checkbox יום בשבוע */}
            <label className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={includeWeekday}
                onChange={(e) => onIncludeWeekdayChange(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span>{t('birthday.includeWeekday', 'כלול יום בשבוע')}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
