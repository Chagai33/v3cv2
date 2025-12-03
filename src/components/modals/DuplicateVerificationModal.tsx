import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, GitMerge } from 'lucide-react';
import { Birthday } from '../../types';
import { format } from 'date-fns';

interface DuplicateVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  duplicates: Birthday[];
  newGroupNames?: string[]; // Names of the new groups being added
}

export const DuplicateVerificationModal: React.FC<DuplicateVerificationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  duplicates,
  newGroupNames = [],
}) => {
  const { t } = useTranslation();

  const existingGroups = useMemo(() => {
    const groups = new Set<string>();
    duplicates.forEach(d => {
        // We don't have group names here directly, just IDs usually.
        // But in the context of display, we might want to show something.
        // For now, we'll just focus on the fact that they exist.
    });
    return groups;
  }, [duplicates]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('modals.duplicateVerification.title', 'Duplicate Found')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          {newGroupNames.length > 0 
            ? t('modals.duplicateVerification.mergeMessageWithGroups', 
                'This person already exists in another group. Would you like to add them to {{groups}} as well, instead of creating a duplicate?',
                { groups: newGroupNames.join(', ') })
            : t('modals.duplicateVerification.mergeMessage', 
                'This person already exists in another group. Would you like to add them to the new group as well, instead of creating a duplicate?')
          }
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          {duplicates.map((birthday) => (
            <div key={birthday.id} className="flex items-center justify-between border-b border-gray-200 last:border-0 pb-2 last:pb-0">
              <div>
                <p className="font-medium text-gray-900">
                  {birthday.first_name} {birthday.last_name}
                </p>
                <p className="text-sm text-gray-500">
                  {format(new Date(birthday.birth_date_gregorian), 'dd/MM/yyyy')}
                </p>
              </div>
              {birthday.birth_date_hebrew_string && (
                <span className="text-sm text-gray-600">
                  {birthday.birth_date_hebrew_string}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <GitMerge className="w-4 h-4" />
            {t('modals.duplicateVerification.mergeConfirm', 'Yes, Add to Group')}
          </button>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
