import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GeltTemplate, AgeGroup, BudgetConfig } from '../../types/gelt';
import { Button } from '../common/Button';
import { useGeltTemplates, useDeleteGeltTemplate, useUpdateGeltTemplate } from '../../hooks/useGeltTemplates';
import { useTenant } from '../../contexts/TenantContext';
import { X, Loader2, Trash2, Star, StarOff, RotateCcw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { DEFAULT_AGE_GROUPS, DEFAULT_BUDGET_CONFIG } from '../../utils/geltConstants';

interface GeltLoadTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (template: GeltTemplate) => void;
  onTemplateDeleted?: (wasDefault: boolean) => void;
}

export const GeltLoadTemplateModal: React.FC<GeltLoadTemplateModalProps> = ({
  isOpen,
  onClose,
  onLoad,
  onTemplateDeleted,
}) => {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { data: templates = [], isLoading, error, isError, refetch } = useGeltTemplates();
  const deleteTemplate = useDeleteGeltTemplate();
  const updateTemplate = useUpdateGeltTemplate();
  const { success, error: showError } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Separate effect for refetch - only once when modal opens
  const hasRefetchedRef = useRef(false);
  
  // Refetch when modal opens (only once)
  useEffect(() => {
    if (isOpen && currentTenant && !hasRefetchedRef.current && !isLoading) {
      hasRefetchedRef.current = true;
      refetch();
    }
    if (!isOpen) {
      hasRefetchedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentTenant?.id]);

  if (!isOpen) return null;

  const handleLoad = (template: GeltTemplate) => {
    onLoad(template);
    onClose();
  };

  const handleLoadSystemDefault = () => {
    // Create a system default profile object
    const systemDefault: GeltTemplate = {
      id: 'system-default',
      tenant_id: currentTenant?.id || '',
      name: t('gelt.systemDefaultProfile'),
      description: t('gelt.systemDefaultProfileDescription'),
      ageGroups: DEFAULT_AGE_GROUPS.map(group => ({ ...group })),
      budgetConfig: { ...DEFAULT_BUDGET_CONFIG },
      customGroupSettings: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: '',
      updated_by: '',
      is_default: false,
    };
    onLoad(systemDefault);
    onClose();
  };

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!window.confirm(t('gelt.confirmDeleteProfile', { name: templateName }))) {
      return;
    }

    // Check if this is the default profile before deleting
    const template = templates.find(t => t.id === templateId);
    const wasDefault = template?.is_default || false;

    setDeletingId(templateId);
    try {
      await deleteTemplate.mutateAsync(templateId);
      success(t('gelt.profileDeleted'));
      
      // Notify parent if default profile was deleted
      if (wasDefault && onTemplateDeleted) {
        onTemplateDeleted(true);
      }
    } catch (err) {
      showError(t('gelt.profileDeleteError'));
      console.error('Failed to delete profile:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleDefault = async (template: GeltTemplate) => {
    try {
      await updateTemplate.mutateAsync({
        templateId: template.id,
        template: {
          is_default: !template.is_default,
        },
      });
      success(
        template.is_default
          ? t('gelt.profileUnsetAsDefault')
          : t('gelt.profileSetAsDefault')
      );
    } catch (err) {
      showError(t('gelt.profileUpdateError'));
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{t('gelt.loadProfile')}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {/* System Default Option - Always visible */}
            <div
              className="flex items-center justify-between p-4 border-2 border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-gray-900">{t('gelt.systemDefaultProfile')}</h3>
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                    {t('gelt.systemDefault')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{t('gelt.systemDefaultProfileDescription')}</p>
                <div className="text-xs text-gray-500">
                  <span>
                    {t('gelt.profileAgeGroups', { count: DEFAULT_AGE_GROUPS.length })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleLoadSystemDefault}
                >
                  {t('gelt.load')}
                </Button>
              </div>
            </div>

            {/* User Profiles */}
            {isError ? (
              <div className="text-center py-8 text-red-500 border border-red-200 rounded-lg bg-red-50 p-4">
                <p className="font-semibold mb-2">{t('gelt.profileLoadError')}</p>
                <p className="text-sm">{error?.message || 'Unknown error'}</p>
                <p className="text-xs mt-2 text-gray-500">
                  {t('gelt.checkConsoleForDetails')}
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm border border-gray-200 rounded-lg bg-gray-50 p-4">
                <p>{t('gelt.noProfiles')}</p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      {template.is_default && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {t('gelt.defaultProfile')}
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    )}
                    <div className="text-xs text-gray-500">
                      <span>
                        {t('gelt.profileAgeGroups', { count: template.ageGroups.length })}
                      </span>
                      {template.budgetConfig.customBudget && (
                        <span className="ml-3">
                          {t('gelt.customBudget')}: {template.budgetConfig.customBudget}₪
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleDefault(template)}
                      className="p-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-lg transition-colors"
                      title={
                        template.is_default
                          ? t('gelt.unsetAsDefault')
                          : t('gelt.setAsDefault')
                      }
                    >
                      {template.is_default ? (
                        <Star className="w-5 h-5 fill-current" />
                      ) : (
                        <StarOff className="w-5 h-5" />
                      )}
                    </button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleLoad(template)}
                    >
                      {t('gelt.load')}
                    </Button>
                    <button
                      onClick={() => handleDelete(template.id, template.name)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={deletingId === template.id}
                      title={t('gelt.deleteProfile')}
                    >
                      {deletingId === template.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            {t('gelt.close')}
          </Button>
        </div>
      </div>
    </div>
  );
};
