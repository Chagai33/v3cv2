import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Info, AlertCircle, Sparkles } from 'lucide-react';
import { Birthday } from '../../types';
import { zodiacService } from '../../services/zodiac.service';

interface ZodiacStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdays: Birthday[];
}

export const ZodiacStatsModal: React.FC<ZodiacStatsModalProps> = ({
  isOpen,
  onClose,
  birthdays,
}) => {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const gregorianCounts: Record<string, number> = {};
    const hebrewCounts: Record<string, number> = {};
    let mismatchCount = 0;

    birthdays.forEach((birthday) => {
      // We need to calculate signs on the fly since they are not stored in the DB object
      // and we might receive raw birthday objects here.
      
      const gregSign = zodiacService.getGregorianSign(new Date(birthday.birth_date_gregorian));
      const hebSign = birthday.hebrew_month ? zodiacService.getHebrewSign(birthday.hebrew_month) : null;

      if (gregSign) {
        gregorianCounts[gregSign] = (gregorianCounts[gregSign] || 0) + 1;
      }

      if (hebSign) {
        hebrewCounts[hebSign] = (hebrewCounts[hebSign] || 0) + 1;
      }

      if (gregSign && hebSign && gregSign !== hebSign) {
        mismatchCount++;
      }
    });

    // Sort by count descending
    const sortedGregorian = Object.entries(gregorianCounts).sort((a, b) => b[1] - a[1]);
    const sortedHebrew = Object.entries(hebrewCounts).sort((a, b) => b[1] - a[1]);

    return { sortedGregorian, sortedHebrew, mismatchCount };
  }, [birthdays]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-600" />
            {t('zodiac.statsTitle', 'סטטיסטיקת מזלות')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {stats.mismatchCount > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                {t('zodiac.mismatchTitle', 'פער בין מזלות')}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {t('zodiac.mismatchDesc', 'ישנם {{count}} אנשים שהמזל העברי שלהם שונה מהמזל הלועזי.', { count: stats.mismatchCount })}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Gregorian Stats */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📅</span>
              {t('zodiac.gregorianDistribution', 'התפלגות לועזית')}
            </h3>
            <div className="space-y-3">
              {stats.sortedGregorian.length === 0 ? (
                 <p className="text-gray-500 text-sm text-center py-4">{t('common.noData', 'אין נתונים')}</p>
              ) : (
                stats.sortedGregorian.map(([sign, count]) => (
                  <div key={sign} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 group-hover:text-blue-500 transition-colors">
                        <Sparkles className="w-3 h-3" />
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {t(`zodiac.${sign}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(count / birthdays.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-6 text-end">{count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Hebrew Stats */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">✡️</span>
              {t('zodiac.hebrewDistribution', 'התפלגות עברית')}
            </h3>
            <div className="space-y-3">
              {stats.sortedHebrew.length === 0 ? (
                 <p className="text-gray-500 text-sm text-center py-4">{t('common.noData', 'אין נתונים')}</p>
              ) : (
                stats.sortedHebrew.map(([sign, count]) => (
                  <div key={sign} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 group-hover:text-purple-500 transition-colors">
                        <Sparkles className="w-3 h-3" />
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {t(`zodiac.${sign}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(count / birthdays.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-6 text-end">{count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-colors"
        >
          {t('common.close', 'סגור')}
        </button>
      </div>
    </div>
  );
};





