import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTranslatedRootGroupName } from '../../utils/groupNameTranslator';

interface GroupFilterDropdownProps {
  allGroups: any[];
  selectedGroupIds: string[];
  toggleGroupFilter: (id: string) => void;
  clearGroupFilters: () => void;
  countsByGroup: Map<string, number>;
  onClose: () => void;
  isMobile?: boolean;
}

export const GroupFilterDropdown: React.FC<GroupFilterDropdownProps> = ({
  allGroups,
  selectedGroupIds,
  toggleGroupFilter,
  clearGroupFilters,
  countsByGroup,
  onClose,
  isMobile = false,
}) => {
  const { t } = useTranslation();
  const rootGroups = allGroups.filter(g => g.is_root);
  const childGroups = allGroups.filter(g => !g.is_root);
  
  const RootGroupLabel: React.FC<{ root: any }> = ({ root }) => {
    const translatedName = useTranslatedRootGroupName(root);
    return <span className="text-xs font-semibold text-gray-500 uppercase">{translatedName}</span>;
  };

  const containerClasses = isMobile
    ? "relative w-full bg-gray-50 rounded-lg mt-1"
    : "absolute top-full mt-2 start-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[280px] max-h-[400px] overflow-y-auto";

  return (
    <div className={containerClasses}>
      {!isMobile && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-700">
            {t('groups.filterByGroup')}
          </span>
          {selectedGroupIds.length > 0 && (
            <button
              onClick={() => {
                clearGroupFilters();
                onClose();
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('common.clear', 'נקה הכל')}
            </button>
          )}
        </div>
      )}

      <div className="py-2">
        {rootGroups.map((root) => {
          const children = childGroups.filter(c => c.parent_id === root.id);
          if (children.length === 0) return null;

          return (
            <div key={root.id} className="mb-2">
              <div className="px-4 py-1 flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: root.color }}
                />
                <RootGroupLabel root={root} />
              </div>
              {children.map((group) => {
                const count = countsByGroup.get(group.id) ?? 0;
                return (
                  <button
                    key={group.id}
                    onClick={() => toggleGroupFilter(group.id)}
                    className={`w-full px-6 py-2 text-start hover:bg-gray-50 flex items-center justify-between ${
                      selectedGroupIds.includes(group.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{group.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        ({count})
                      </span>
                    </div>
                    {selectedGroupIds.includes(group.id) && (
                      <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};


