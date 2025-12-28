import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle, Trash2, AlertCircle, Loader } from 'lucide-react';
import { Birthday } from '../../types';
import { useDeleteBirthday } from '../../hooks/useBirthdays';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface RecentGuestActivityProps {
  birthdays: Birthday[];
}

export const RecentGuestActivity: React.FC<RecentGuestActivityProps> = ({ birthdays }) => {
  const { t, i18n } = useTranslation();
  const deleteBirthday = useDeleteBirthday();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter for guest-created birthdays, sorted by creation date (most recent first)
  const guestBirthdays = birthdays
    .filter(b => b.created_by_guest === true)
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // Descending order (newest first)
    })
    .slice(0, 5); // Take only the 5 most recent

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

  if (guestBirthdays.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {t('dashboard.recentGuestActivity', 'פעילות אורחים אחרונה')}
            </h2>
            <p className="text-xs text-gray-500">
              {t('dashboard.last5GuestAdditions', '5 ההוספות האחרונות')}
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <UserCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-1">
            {t('dashboard.noGuestActivity', 'אין פעילות אורחים אחרונה')}
          </p>
          <p className="text-sm text-gray-500">
            {t('dashboard.guestActivityWillAppearHere', 'ימי הולדת שיוספו על ידי אורחים יופיעו כאן')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">
            {t('dashboard.recentGuestActivity', 'פעילות אורחים אחרונה')}
          </h2>
          <p className="text-xs text-gray-500">
            {t('dashboard.last5GuestAdditions', '5 ההוספות האחרונות')}
          </p>
        </div>
        <div className="text-sm bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-semibold">
          {guestBirthdays.length}
        </div>
      </div>

      <div className="space-y-2">
        {guestBirthdays.map((birthday) => (
          <div
            key={birthday.id}
            className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              birthday.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'
            }`}>
              <span className="text-lg">
                {birthday.gender === 'male' ? '👨' : '👩'}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {birthday.first_name} {birthday.last_name}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="truncate">
                  {format(new Date(birthday.birth_date_gregorian), 'dd/MM/yyyy')}
                </span>
                <span>•</span>
                <span className="truncate">
                  {formatDate(birthday.created_at)}
                </span>
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={() => handleDelete(birthday)}
              disabled={deletingId === birthday.id}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              title={t('dashboard.undoAdd', 'בטל הוספה')}
            >
              {deletingId === birthday.id ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          {t('dashboard.guestActivityInfo', 'ימי הולדת אלו נוספו על ידי אורחים דרך קישור שיתוף. תוכל למחוק אותם במידת הצורך.')}
        </p>
      </div>
    </div>
  );
};




