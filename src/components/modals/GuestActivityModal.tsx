import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserCircle, Trash2, AlertCircle, Loader, Users, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { Birthday, Group } from '../../types';
import { useDeleteBirthday } from '../../hooks/useBirthdays';
import { useGroups } from '../../hooks/useGroups';
import { useGuestNotifications } from '../../contexts/GuestNotificationsContext';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface GuestActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdays: Birthday[];
}

interface GuestActivityItemProps {
  birthday: Birthday;
  onDelete: (birthday: Birthday) => void;
  deletingId: string | null;
  getBirthdayGroups: (birthday: Birthday) => Group[];
  getGroupName: (group: Group) => string;
  formatDate: (date: string) => string;
  t: (key: string, defaultValue?: string) => string;
  isNew: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const GuestActivityItem: React.FC<GuestActivityItemProps> = ({ 
  birthday, onDelete, deletingId, getBirthdayGroups, getGroupName, formatDate, t, isNew, isSelected, onToggleSelect
}) => {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl transition-all border ${
      isSelected 
        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
        : isNew 
          ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200' 
          : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
    }`}>
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(birthday.id)}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
      />
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
        
        {/* Groups */}
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {getBirthdayGroups(birthday).map(group => (
            <div 
              key={group.id}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border"
              style={{ 
                backgroundColor: '#fff',
                borderColor: group.color,
                color: '#374151' // gray-700
              }}
            >
              <div 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="truncate max-w-[100px]">{getGroupName(group)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-gray-500 mt-1">
          <span className="truncate">
            {t('common.birthDate')}: <span className="text-gray-700 font-medium">{format(new Date(birthday.birth_date_gregorian), 'dd/MM/yyyy')}</span>
          </span>
          <span className="hidden sm:inline w-px h-3 bg-gray-300"></span>
          <span className="truncate">
            {t('common.created')}: <span className="text-gray-700 font-medium">{formatDate(birthday.created_at)}</span>
          </span>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={() => onDelete(birthday)}
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
  );
};

export const GuestActivityModal: React.FC<GuestActivityModalProps> = ({ isOpen, onClose, birthdays }) => {
  const { t, i18n } = useTranslation();
  const deleteBirthday = useDeleteBirthday();
  const { data: allGroups = [] } = useGroups();
  const { markAsRead, isNew } = useGuestNotifications();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter for guest-created birthdays, sorted by creation date (most recent first)
  const guestBirthdays = useMemo(() => {
    const list = birthdays
      .filter(b => b.created_by_guest === true)
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Descending order (newest first)
      })
      .slice(0, 20); // Show up to 20 most recent
      
      // Categorize into New and History
      const newBirthdays = list.filter(b => isNew(b.created_at));
      const historyBirthdays = list.filter(b => !isNew(b.created_at));
      
      return { all: list, new: newBirthdays, history: historyBirthdays };
  }, [birthdays, isNew]);

  const handleMarkAsRead = async () => {
    await markAsRead();
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === guestBirthdays.all.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(guestBirthdays.all.map(b => b.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    if (!window.confirm(
      t('dashboard.deleteSelectedConfirm', `האם אתה בטוח שברצונך למחוק ${selectedIds.size} רשומות?`)
    )) {
      return;
    }

    for (const id of selectedIds) {
      try {
        await deleteBirthday.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting guest birthday:', error);
      }
    }
    setSelectedIds(new Set());
  };

  const handleMarkSelectedAsRead = async () => {
    // Mark only selected new items as read by updating the timestamp
    const selectedNewBirthdays = guestBirthdays.new.filter(b => selectedIds.has(b.id));
    if (selectedNewBirthdays.length === 0) return;
    
    // Mark all as read - this updates both localStorage and Firestore
    await markAsRead();
    setSelectedIds(new Set());
  };

  const selectedNewCount = guestBirthdays.new.filter(b => selectedIds.has(b.id)).length;

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

  const getGroupName = (group: Group) => {
    if (group.is_root && group.type) {
      const translationKeys: Record<string, string> = {
        family: 'groups.family',
        friends: 'groups.friends',
        work: 'groups.work',
      };
      return t(translationKeys[group.type] || group.name);
    }
    return group.name;
  };

  const getBirthdayGroups = (birthday: Birthday) => {
    const groupIds = birthday.group_ids || (birthday.group_id ? [birthday.group_id] : []);
    return allGroups.filter(g => groupIds.includes(g.id));
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
            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-full font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('common.deleteSelected', 'מחק נבחרים')} ({selectedIds.size})</span>
                </button>
                {selectedNewCount > 0 && (
                  <button
                    onClick={handleMarkSelectedAsRead}
                    className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-full font-medium transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>{t('common.markSelectedAsRead', 'סמן נבחרים כנקרא')} ({selectedNewCount})</span>
                  </button>
                )}
              </>
            )}
            {guestBirthdays.new.length > 0 && selectedIds.size === 0 && (
              <button
                onClick={handleMarkAsRead}
                className="flex items-center gap-1.5 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded-full font-medium transition-colors"
                title={t('common.markAsRead', 'סמן הכל כנקרא')}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t('common.markAsRead', 'סמן הכל כנקרא')}</span>
              </button>
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
          {guestBirthdays.all.length === 0 ? (
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
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.size === guestBirthdays.all.length && guestBirthdays.all.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>
                    {selectedIds.size === guestBirthdays.all.length && guestBirthdays.all.length > 0
                      ? t('common.deselectAll', 'בטל בחירה')
                      : t('common.selectAll', 'בחר הכל')}
                  </span>
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedIds.size} {t('common.selected', 'נבחרו')}
                  </span>
                )}
              </div>

              <div className="space-y-6">
              {/* New Items Section */}
              {guestBirthdays.new.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t('common.new', 'חדש')}</h3>
                  </div>
                  {guestBirthdays.new.map((birthday) => (
                    <GuestActivityItem 
                      key={birthday.id} 
                      birthday={birthday} 
                      onDelete={handleDelete}
                      deletingId={deletingId}
                      getBirthdayGroups={getBirthdayGroups}
                      getGroupName={getGroupName}
                      formatDate={formatDate}
                      t={t}
                      isNew={true}
                      isSelected={selectedIds.has(birthday.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              )}

              {/* History Items Section - Accordion */}
              {guestBirthdays.history.length > 0 && (
                <div className="space-y-3">
                  {/* Accordion Header */}
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 mt-4"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                        {t('common.history', 'היסטוריה')}
                      </h3>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                        {guestBirthdays.history.length}
                      </span>
                    </div>
                    {showHistory ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>

                  {/* Accordion Content */}
                  {showHistory && (
                    <div className="space-y-3 animate-slide-in">
                      {guestBirthdays.history.map((birthday) => (
                        <GuestActivityItem 
                          key={birthday.id} 
                          birthday={birthday} 
                          onDelete={handleDelete}
                          deletingId={deletingId}
                          getBirthdayGroups={getBirthdayGroups}
                          getGroupName={getGroupName}
                          formatDate={formatDate}
                          t={t}
                          isNew={false}
                          isSelected={selectedIds.has(birthday.id)}
                          onToggleSelect={toggleSelect}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              </div>
            </>
          )}

          {/* Info Note */}
          {guestBirthdays.all.length > 0 && (
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
