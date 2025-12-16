import React from 'react';
import { useTranslation } from 'react-i18next';
import { Birthday } from '../../types';
import { Gift, X, Calendar, Edit, Trash2 } from 'lucide-react';
import { SyncStatusButton } from '../birthdays/SyncStatusButton';

interface BirthdayQuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthday: Birthday | null;
  isConnected: boolean;
  isSyncing: boolean;
  isPendingChange: boolean;
  isSyncLoading: boolean;
  onSync: (id: string) => void;
  onRemove: (id: string) => void;
  onWishlist: (birthday: Birthday) => void;
  onEdit: (birthday: Birthday) => void;
  onDelete: (id: string) => void;
}

export const BirthdayQuickActionsModal: React.FC<BirthdayQuickActionsModalProps> = ({
  isOpen,
  onClose,
  birthday,
  isConnected,
  isSyncing,
  isPendingChange,
  isSyncLoading,
  onSync,
  onRemove,
  onWishlist,
  onEdit,
  onDelete
}) => {
  const { t, i18n } = useTranslation();

  if (!isOpen || !birthday) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {birthday.first_name} {birthday.last_name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('common.actions', 'פעולות מהירות')}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Grid */}
        <div className="p-4 grid grid-cols-1 gap-3">
          
          {/* Wishlist Action */}
          <button
            onClick={() => {
              onWishlist(birthday);
              onClose();
            }}
            className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-white hover:bg-pink-50 hover:border-pink-200 transition-all group shadow-sm hover:shadow-md text-start"
          >
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-semibold text-gray-900 group-hover:text-pink-700">
                {t('wishlist.title', 'רשימת מתנות')}
              </span>
              <span className="text-xs text-gray-500">
                {t('wishlist.manage', 'ניהול פריטים ומשאלות')}
              </span>
            </div>
          </button>

          {/* Sync Action - Only if connected */}
          {isConnected && (
            <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all group shadow-sm hover:shadow-md text-start relative overflow-hidden">
               <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none border-2 border-blue-500/10 rounded-xl transition-opacity" />
               
               {/* Reuse the existing button logic but styled as a wrapper */}
               <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  {/* We render the SyncStatusButton here to handle the logic/icons, but we might intercept the click via the parent or let it bubble */}
                  <SyncStatusButton
                    birthday={birthday}
                    isPendingChange={isPendingChange}
                    isLoading={isSyncLoading}
                    isDisabled={isSyncing}
                    onSync={(id) => onSync(id)}
                    onRemove={(id) => onRemove(id)}
                  />
               </div>
               
               <div className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-900 group-hover:text-blue-700">
                    {t('googleCalendar.sync', 'סנכרון ליומן')}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {birthday.isSynced 
                        ? t('googleCalendar.synced', 'מסונכרן עם Google') 
                        : t('googleCalendar.notSynced', 'לחץ לסנכרון')}
                  </span>
               </div>
            </div>
          )}

           {/* Edit Action */}
           <button
            onClick={() => {
              onEdit(birthday);
              onClose();
            }}
            className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-white hover:bg-orange-50 hover:border-orange-200 transition-all group shadow-sm hover:shadow-md text-start"
          >
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-semibold text-gray-900 group-hover:text-orange-700">
                {t('common.edit', 'עריכה')}
              </span>
              <span className="text-xs text-gray-500">
                {t('birthday.editDetails', 'עריכת פרטים אישיים')}
              </span>
            </div>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <button
                onClick={() => {
                    if (window.confirm(t('common.confirmDelete'))) {
                        onDelete(birthday.id);
                        onClose();
                    }
                }}
                className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
                <Trash2 className="w-4 h-4" />
                {t('common.delete', 'מחיקה')}
            </button>
             <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium px-2 py-1"
            >
                {t('common.close', 'סגור')}
            </button>
        </div>
      </div>
    </div>
  );
};


