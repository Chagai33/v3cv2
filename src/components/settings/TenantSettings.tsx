import { FloatingBackButton } from '../common/FloatingBackButton';
import { logger } from "../../utils/logger";
import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useTenant } from '../../contexts/TenantContext';
import { CalendarPreferenceSelector } from './CalendarPreferenceSelector';
import { CalendarPreference } from '../../types';
import { Settings, Save, X, Trash2, AlertTriangle, Globe, Info, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../common/Toast';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import { useGroups, useUpdateGroup } from '../../hooks/useGroups';

interface TenantSettingsProps {
  onClose: () => void;
}

export const TenantSettings: React.FC<TenantSettingsProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const { currentTenant, updateTenant } = useTenant();
  const { toasts, hideToast, success, error } = useToast();
  const { data: groups = [] } = useGroups();
  const updateGroup = useUpdateGroup();

  const [preference, setPreference] = useState<CalendarPreference>(
    currentTenant?.default_calendar_preference || 'both'
  );
  const [isGuestPortalEnabled, setIsGuestPortalEnabled] = useState(
    currentTenant?.is_guest_portal_enabled ?? true
  );
  const [isSaving, setIsSaving] = useState(false);

  // Group Exceptions State
  const [showGroupExceptions, setShowGroupExceptions] = useState(false);

  // Deletion State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionSummary, setDeletionSummary] = useState<{groupsCount: number, birthdaysCount: number} | null>(null);
  const [isCalculatingSummary, setIsCalculatingSummary] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Info Popup State
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    try {
      await updateTenant(currentTenant.id, {
        default_calendar_preference: preference,
        is_guest_portal_enabled: isGuestPortalEnabled,
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

  const handleGroupToggle = async (groupId: string, currentValue: boolean | undefined) => {
    // If undefined, it defaults to true (enabled), so toggling means setting to false
    const newValue = currentValue === false ? true : false;
    
    try {
      await updateGroup.mutateAsync({
        groupId: groupId,
        data: { is_guest_portal_enabled: newValue }
      });
    } catch (err) {
      logger.error('Error updating group portal access:', err);
      error(t('common.error'));
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

  // Sort groups: Parents first, then alphabetically
  const sortedGroups = [...groups].sort((a, b) => {
    if (!a.parent_id && b.parent_id) return -1;
    if (a.parent_id && !b.parent_id) return 1;
    return a.name.localeCompare(b.name);
  });

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

            {/* Guest Portal Settings */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-purple-600 mt-1">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {t('tenant.guestPortalAccess', 'Guest Portal Access')}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {t('tenant.guestPortalDescription', 'Allow guests to access and manage their wishlists via the public portal.')}
                        </p>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowInfoPopup(!showInfoPopup)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50 focus:outline-none"
                          title={t('common.moreInfo', 'More Info')}
                        >
                          <Info className="w-5 h-5" />
                        </button>
                        
                        {/* Info Popup */}
                        {showInfoPopup && (
                          <>
                            <div 
                              className="fixed inset-0 z-[70]" 
                              onClick={() => setShowInfoPopup(false)}
                            />
                            {/* Desktop Popup */}
                            <div className="hidden sm:block absolute top-full left-1/2 -translate-x-1/2 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-5 z-[71] text-sm text-gray-600">
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-gray-200 rotate-45"></div>
                              <div className="relative z-10 space-y-3">
                                <h4 className="font-semibold text-gray-900 text-base">
                                  {t('tenant.aboutGuestPortal', 'About the Guest Portal')}
                                </h4>
                                <p className="leading-relaxed">
                                  {t('tenant.guestPortalDetailedDesc', 'The guest portal allows your family and friends to easily access and update their own wishlists without creating a user account. They simply verify their identity using their name and birth date.')}
                                </p>
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                  <h5 className="font-medium text-blue-900 text-xs mb-1">
                                    {t('tenant.howItWorks', 'How it works:')}
                                  </h5>
                                  <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                                    <li>
                                      <Trans
                                        i18nKey="tenant.howItWorksStep1"
                                        defaults="Guests visit the <0>portal link</0>"
                                        components={[
                                          <a
                                            href="/portal"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline font-medium"
                                            key="link"
                                          >
                                            portal link
                                          </a>
                                        ]}
                                      />
                                    </li>
                                    <li>{t('tenant.howItWorksStep2', 'They enter their name and birth date')}</li>
                                    <li>{t('tenant.howItWorksStep3', 'Once verified, they can manage their wishlist')}</li>
                                  </ul>
                                </div>
                                <p className="text-xs text-gray-500 pt-2 border-t border-gray-100 italic">
                                  {t('tenant.guestPortalExceptionNote', 'This is a global setting. You can override this for specific groups in the Groups management page.')}
                                </p>
                              </div>
                            </div>

                            {/* Mobile Popup (Centered Modal) */}
                            <div className="sm:hidden fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none">
                              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-full max-w-sm pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-semibold text-gray-900 text-base">
                                    {t('tenant.aboutGuestPortal', 'About the Guest Portal')}
                                  </h4>
                                  <button 
                                    onClick={() => setShowInfoPopup(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                                <div className="space-y-3 text-sm text-gray-600">
                                  <p className="leading-relaxed">
                                    {t('tenant.guestPortalDetailedDesc', 'The guest portal allows your family and friends to easily access and update their own wishlists without creating a user account. They simply verify their identity using their name and birth date.')}
                                  </p>
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <h5 className="font-medium text-blue-900 text-xs mb-1">
                                      {t('tenant.howItWorks', 'How it works:')}
                                    </h5>
                                    <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                                      <li>
                                        <Trans
                                          i18nKey="tenant.howItWorksStep1"
                                          defaults="Guests visit the <0>portal link</0>"
                                          components={[
                                            <a
                                              href="/portal"
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline font-medium"
                                              key="link"
                                            >
                                              portal link
                                            </a>
                                          ]}
                                        />
                                      </li>
                                      <li>{t('tenant.howItWorksStep2', 'They enter their name and birth date')}</li>
                                      <li>{t('tenant.howItWorksStep3', 'Once verified, they can manage their wishlist')}</li>
                                    </ul>
                                  </div>
                                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-100 italic">
                                    {t('tenant.guestPortalExceptionNote', 'This is a global setting. You can override this for specific groups in the Groups management page.')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isGuestPortalEnabled}
                        onChange={(e) => setIsGuestPortalEnabled(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  {/* Group Exceptions List - Only visible if global setting is enabled */}
                  {isGuestPortalEnabled && (
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <button 
                        onClick={() => setShowGroupExceptions(!showGroupExceptions)}
                        className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-purple-700 transition-colors group p-1"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">ניהול הרשאות לפי קבוצות</span>
                        </div>
                        {showGroupExceptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      {showGroupExceptions && (
                        <div className="mt-3 space-y-1 pl-1 animate-in fade-in slide-in-from-top-1 duration-200 bg-gray-50 rounded-lg p-2 max-h-80 overflow-y-auto custom-scrollbar">
                          {groups.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-2">לא נמצאו קבוצות</p>
                          ) : (
                            // Build Tree Structure
                            (() => {
                              const rootGroups = groups.filter(g => !g.parent_id).sort((a, b) => a.name.localeCompare(b.name));
                              
                              return rootGroups.map((rootGroup, index) => {
                                const childGroups = groups
                                  .filter(g => g.parent_id === rootGroup.id)
                                  .sort((a, b) => a.name.localeCompare(b.name));
                                
                                const isRootEnabled = rootGroup.is_guest_portal_enabled !== false; // Default true
                                const hasChildren = childGroups.length > 0;
                                
                                return (
                                  <div key={rootGroup.id} className="mb-3 border border-gray-200 rounded-xl overflow-hidden">
                                    {/* Root Group Header */}
                                    <div className={`flex items-center justify-between py-2.5 px-3 ${!isRootEnabled && hasChildren ? 'bg-gray-100' : 'bg-gray-50'}`}>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white border border-gray-200 shadow-sm shrink-0">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: rootGroup.color || '#CBD5E1' }}></div>
                                        </div>
                                        <span className={`text-sm font-bold truncate ${(!isRootEnabled && hasChildren) ? 'text-gray-500' : 'text-gray-800'}`}>
                                          {rootGroup.name}
                                        </span>
                                      </div>
                                      
                                      {/* Checkbox adjacent to name (left side in Hebrew) */}
                                      <div className="flex items-center pl-1">
                                        {hasChildren ? (
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0" title={isRootEnabled ? 'השבת קבוצה' : 'הפעל קבוצה'}>
                                              <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isRootEnabled}
                                                onChange={() => handleGroupToggle(rootGroup.id, rootGroup.is_guest_portal_enabled)}
                                              />
                                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                            </label>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                                                אין קבוצות
                                            </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Child Groups Body */}
                                    {hasChildren && (
                                      <div className="bg-white p-1 space-y-0.5">
                                        {childGroups.map(child => {
                                          const isChildEnabledInDB = child.is_guest_portal_enabled !== false;
                                          const isEffectiveEnabled = isRootEnabled && isChildEnabledInDB;
                                          
                                          return (
                                            <label 
                                              key={child.id} 
                                              className={`flex items-center justify-between py-2 px-3 rounded-lg transition-all border border-transparent ${
                                                  isRootEnabled ? 'hover:bg-purple-50 cursor-pointer' : 'cursor-not-allowed opacity-60'
                                              }`}
                                            >
                                              <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                                    isEffectiveEnabled 
                                                        ? 'bg-purple-600 border-purple-600' 
                                                        : 'bg-white border-gray-300'
                                                }`}>
                                                    {isEffectiveEnabled && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <div className="flex items-center gap-2 min-w-0">
                                                     <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: child.color || '#CBD5E1' }}></span>
                                                     <span className={`text-sm font-medium truncate ${!isRootEnabled ? 'text-gray-400' : 'text-gray-700'}`}>
                                                       {child.name}
                                                     </span>
                                                </div>
                                              </div>
                                              
                                              {/* Hidden Native Checkbox */}
                                              <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={isEffectiveEnabled}
                                                disabled={!isRootEnabled}
                                                onChange={() => {
                                                    if (isRootEnabled) {
                                                        handleGroupToggle(child.id, child.is_guest_portal_enabled);
                                                    }
                                                }}
                                              />
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
