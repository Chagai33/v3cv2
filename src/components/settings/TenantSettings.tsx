import { FloatingBackButton } from '../common/FloatingBackButton';
import { logger } from "../../utils/logger";
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../contexts/TenantContext';
import { CalendarPreferenceSelector } from './CalendarPreferenceSelector';
import { CalendarPreference } from '../../types';
import { Settings, Save, X, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../common/Toast';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';

interface TenantSettingsProps {
  onClose: () => void;
}

export const TenantSettings: React.FC<TenantSettingsProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const { currentTenant, updateTenant } = useTenant();
  const { toasts, hideToast, success, error } = useToast();

  const [preference, setPreference] = useState<CalendarPreference>(
    currentTenant?.default_calendar_preference || 'both'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Deletion State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionSummary, setDeletionSummary] = useState<{groupsCount: number, birthdaysCount: number} | null>(null);
  const [isCalculatingSummary, setIsCalculatingSummary] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    try {
      await updateTenant(currentTenant.id, {
        default_calendar_preference: preference,
      });
      success(t('messages.tenantUpdated'));
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      error(t('common.error'));
      logger.error('Error updating tenant settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrepareDelete = async () => {
    if (!currentTenant) return;
    setShowDeleteConfirm(true);
    setIsCalculatingSummary(true);
    try {
      const getSummary = httpsCallable(functions, 'getAccountDeletionSummary');
      const result = await getSummary({ tenantId: currentTenant.id });
      setDeletionSummary(result.data as any);
    } catch (err) {
      logger.error('Error getting deletion summary:', err);
      error(t('common.error'));
      setShowDeleteConfirm(false);
    } finally {
      setIsCalculatingSummary(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentTenant) return;
    setIsDeleting(true);
    try {
      const deleteAccount = httpsCallable(functions, 'deleteAccount');
      await deleteAccount({ tenantId: currentTenant.id });
      await signOut(auth);
      window.location.reload();
    } catch (err) {
      logger.error('Error deleting account:', err);
      error(t('common.error'));
      setIsDeleting(false);
    }
  };

  if (!currentTenant) {
    return null;
  }

  return (
    <>
      <FloatingBackButton
        onClick={onClose}
        position={isHebrew ? 'bottom-left' : 'bottom-right'}
        className="z-[60]"
      />
      <FloatingBackButton
        onClick={onClose}
        showOnDesktop
        customPosition={`top-6 ${isHebrew ? 'right-6' : 'left-6'} hidden sm:block`}
        className="z-[60]"
      />
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('tenant.settings')}
                </h2>
                <p className="text-sm text-gray-600">{currentTenant.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="text-blue-600 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    {t('tenant.defaultCalendarPreference')}
                  </h3>
                  <p className="text-sm text-blue-800">
                    {t('tenant.preferenceDescription')}
                  </p>
                </div>
              </div>
            </div>

            <CalendarPreferenceSelector
              value={preference}
              onChange={setPreference}
              showDescription={true}
              label={t('birthday.calendarPreference')}
            />

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
              <h4 className="font-semibold text-gray-900">
                {t('common.notes', 'Notes')}:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t('settings.note1', 'This setting applies to all groups in this tenant by default')}</li>
                <li>{t('settings.note2', 'Groups can override this with their own preference')}</li>
                <li>{t('settings.note3', 'Individual records can override group preferences')}</li>
              </ul>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {t('settings.dangerZone', 'Danger Zone')}
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-900 mb-1">
                    {t('settings.deleteAccount', 'Delete Account')}
                  </h4>
                  <p className="text-sm text-red-700">
                    {t('settings.deleteAccountDescription', 'Permanently delete your account and all data')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrepareDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete', 'Delete')}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('settings.deleteAccountConfirmTitle', 'Are you absolutely sure?')}
              </h3>
              <p className="text-gray-600">
                {t('settings.deleteAccountConfirmDescription', 'This action cannot be undone. This will permanently delete your account and remove your data from our servers.')}
              </p>
            </div>

            {isCalculatingSummary ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : deletionSummary ? (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t('settings.summaryOfData', 'Summary of data to be deleted:')}
                </h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex justify-between">
                    <span>{t('common.groups', 'Groups')}:</span>
                    <span className="font-medium">{deletionSummary.groupsCount}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>{t('common.birthdays', 'Birthdays')}:</span>
                    <span className="font-medium">{deletionSummary.birthdaysCount}</span>
                  </li>
                </ul>
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting || isCalculatingSummary}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('common.deleting', 'Deleting...')}
                  </>
                ) : (
                  t('settings.confirmDelete', 'Yes, delete account')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </>
  );
};
