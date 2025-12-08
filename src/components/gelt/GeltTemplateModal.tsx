import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AgeGroup, BudgetConfig, GeltTemplate } from '../../types/gelt';
import { Button } from '../common/Button';
import { X, Save, Loader2 } from 'lucide-react';

const MAX_PROFILE_NAME_LENGTH = 50;
const MAX_PROFILE_DESCRIPTION_LENGTH = 100;
const MAX_PROFILES_COUNT = 10;

interface GeltTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: {
    name: string;
    description?: string;
    ageGroups: AgeGroup[];
    budgetConfig: BudgetConfig;
    customGroupSettings: AgeGroup[] | null;
    is_default?: boolean;
  }) => Promise<void>;
  currentAgeGroups: AgeGroup[];
  currentBudgetConfig: BudgetConfig;
  currentCustomGroupSettings: AgeGroup[] | null;
  existingTemplates?: GeltTemplate[];
  isLoading?: boolean;
}

export const GeltTemplateModal: React.FC<GeltTemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentAgeGroups,
  currentBudgetConfig,
  currentCustomGroupSettings,
  existingTemplates = [],
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setIsDefault(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Reset error
    setError(null);

    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('gelt.profileNameRequired'));
      return;
    }

    // Validate name length
    if (trimmedName.length > MAX_PROFILE_NAME_LENGTH) {
      setError(t('gelt.profileNameTooLong', { max: MAX_PROFILE_NAME_LENGTH }));
      return;
    }

    // Validate description length
    const trimmedDescription = description.trim();
    if (trimmedDescription && trimmedDescription.length > MAX_PROFILE_DESCRIPTION_LENGTH) {
      setError(t('gelt.profileDescriptionTooLong', { max: MAX_PROFILE_DESCRIPTION_LENGTH }));
      return;
    }

    // Check for duplicate name
    const duplicateProfile = existingTemplates.find(
      (t) => t.name.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (duplicateProfile) {
      setError(t('gelt.profileNameDuplicate'));
      return;
    }

    // Check max profiles count
    if (existingTemplates.length >= MAX_PROFILES_COUNT) {
      setError(t('gelt.profileMaxCountReached', { max: MAX_PROFILES_COUNT }));
      return;
    }

    try {
      await onSave({
        name: trimmedName,
        description: trimmedDescription || undefined,
        ageGroups: currentAgeGroups,
        budgetConfig: currentBudgetConfig,
        customGroupSettings: currentCustomGroupSettings,
        is_default: isDefault,
      });
      onClose();
    } catch (err) {
      setError(t('gelt.profileSaveError'));
      console.error('Failed to save profile:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{t('gelt.saveProfile')}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('gelt.profileName')} *
              </label>
              <span className="text-xs text-gray-400">
                {name.length}/{MAX_PROFILE_NAME_LENGTH}
              </span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_PROFILE_NAME_LENGTH}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('gelt.profileNamePlaceholder')}
              disabled={isLoading}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('gelt.profileDescription')}
              </label>
              <span className="text-xs text-gray-400">
                {description.length}/{MAX_PROFILE_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_PROFILE_DESCRIPTION_LENGTH}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('gelt.profileDescriptionPlaceholder')}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700 cursor-pointer">
              {t('gelt.setAsDefaultProfile')}
            </label>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">{t('gelt.profileWillSave')}:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('gelt.profileWillSaveAgeGroups', { count: currentAgeGroups.length })}</li>
              <li>{t('gelt.profileWillSaveBudgetConfig')}</li>
              {currentCustomGroupSettings && (
                <li>{t('gelt.profileWillSaveCustomSettings')}</li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            {isLoading ? t('common.saving') : t('gelt.saveProfile')}
          </Button>
        </div>
      </div>
    </div>
  );
};
