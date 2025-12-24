import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserCircle, Trash2, AlertCircle, Loader } from 'lucide-react';
import { Birthday } from '../../types';
import { useDeleteBirthday } from '../../hooks/useBirthdays';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface GuestActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdays: Birthday[];
}

export const GuestActivityModal: React.FC<GuestActivityModalProps> = ({ isOpen, onClose, birthdays }) => {
  const { t, i18n } = useTranslation();
  const deleteBirthday = useDeleteBirthday();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter for guest-created birthdays, sorted by creation date (most recent first)
  const guestBirthdays = useMemo(() => {
    return birthdays
      .filter(b => b.created_by_guest === true)
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Descending order (newest first)
      })
      .slice(0, 20); // Show up to 20 most recent
  }, [birthdays]);

  const handleDelete = async (birthday: Birthday) => {
    if (!window.confirm(
      t('dashboard.undoAddConfirm', 'האם אתה בטוח שברצונך למחוק את יום ההולדת הזה שנוסף על ידי אורח?')
    )) {
      return;
    }

    setDeletingId(birthday.id);
    try {
      await deleteBirthday.mutateAsync(birthday.id);
    } catch (error) {
      console.error('Error deleting guest birthday:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const locale = i18n.language === 'he' ? he : enUS;
      return format(date, 'dd/MM/yyyy HH:mm', { locale });
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('dashboard.recentGuestActivity', 'פעילות אורחים אחרונה')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('dashboard.guestActivitySubtitle', 'ימי הולדת שנוספו על ידי אורחים')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {guestBirthdays.length > 0 && (
              <div className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                {guestBirthdays.length}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {guestBirthdays.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <UserCircle className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-900 font-semibold text-lg mb-2">
                {t('dashboard.noGuestActivity', 'אין פעילות אורחים אחרונה')}
              </p>
              <p className="text-sm text-gray-500 max-w-md">
                {t('dashboard.guestActivityWillAppearHere', 'ימי הולדת שיוספו על ידי אורחים יופיעו כאן')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {guestBirthdays.map((birthday) => (
                <div
                  key={birthday.id}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-xl transition-all border border-purple-200"
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    birthday.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'
                  }`}>
                    <span className="text-2xl">
                      {birthday.gender === 'male' ? '👨' : '👩'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-base truncate">
                      {birthday.first_name} {birthday.last_name}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-gray-600">
                      <span className="truncate">
                        📅 {format(new Date(birthday.birth_date_gregorian), 'dd/MM/yyyy')}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="truncate">
                        🕐 {formatDate(birthday.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(birthday)}
                    disabled={deletingId === birthday.id}
                    className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title={t('dashboard.undoAdd', 'בטל הוספה')}
                  >
                    {deletingId === birthday.id ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Info Note */}
          {guestBirthdays.length > 0 && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                {t('dashboard.guestActivityInfo', 'ימי הולדת אלו נוספו על ידי אורחים דרך קישור שיתוף. תוכל למחוק אותם במידת הצורך.')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            {t('common.close', 'סגור')}
          </button>
        </div>
      </div>
    </div>
  );
};

