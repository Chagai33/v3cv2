import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FolderPlus, Plus } from 'lucide-react';
import { Group } from '../../types';
import { MultiSelectGroups } from '../common/MultiSelectGroups';
import { useCreateGroup } from '../../hooks/useGroups'; 
import { logger } from '../../utils/logger';

interface AssignGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (groupIds: string[]) => void;
  groups: Group[];
  count: number;
}

export const AssignGroupModal = ({
  isOpen,
  onClose,
  onConfirm,
  groups,
  count,
}: AssignGroupModalProps) => {
  const { t } = useTranslation();
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParentId, setNewGroupParentId] = useState('');
  
  const createGroup = useCreateGroup();

  // Reset state when modal opens/closes - modal always opens empty (add mode)
  useEffect(() => {
    if (!isOpen) {
      // Reset everything when modal closes
      setSelectedGroupIds([]);
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupParentId('');
    }
  }, [isOpen]);

  const { rootGroups, childGroups } = useMemo(() => {
    return {
      rootGroups: groups.filter(g => g.is_root),
      childGroups: groups.filter(g => !g.is_root),
    };
  }, [groups]);

  const groupOptions = useMemo(() => {
    // 1. מיון היררכי: קודם כל קבוצות שורש, ואחריהן הילדים שלהן
    const sortedRoots = rootGroups.sort((a, b) => {
       // סדר עדיפות קבוע
       const order: Record<string, number> = { 'family': 1, 'friends': 2, 'work': 3 };
       const orderA = a.type ? order[a.type] || 99 : 99;
       const orderB = b.type ? order[b.type] || 99 : 99;
       
       if (orderA !== orderB) return orderA - orderB;
       return a.name.localeCompare(b.name);
    });

    // בניית הרשימה השטוחה לתצוגה
    const options: any[] = [];
    
    sortedRoots.forEach(root => {
        // תרגום שם קבוצת השורש
        let rootName = root.name;
        if (root.type) {
            const key = `groups.${root.type}`;
            const translated = t(key);
            if (translated !== key) rootName = translated;
        }

        options.push({
            id: root.id,
            name: rootName,
            isRoot: true, // זה יגרום לה להיות מוצגת באפור ולא ניתנת לבחירה ב-MultiSelectGroups הקיים
            parentName: undefined
        });

        // הוספת הילדים
        const children = groups
            .filter(g => g.parent_id === root.id)
            .sort((a, b) => a.name.localeCompare(b.name));
            
        children.forEach(child => {
            options.push({
                id: child.id,
                name: child.name,
                isRoot: false,
                parentName: rootName
            });
        });
    });

    return options;
  }, [groups, rootGroups, t]);

  // Unified action handler for the main Confirm button
  const handleConfirmAction = async () => {
      // 1. If create group form is open and valid, create group AND confirm selection
      if (showCreateGroup && newGroupName.trim() && newGroupParentId) {
          try {
              const newGroupId = await createGroup.mutateAsync({
                  name: newGroupName.trim(),
                  parentId: newGroupParentId
              });
              
              // Add new group to existing selection and confirm immediately
              const finalSelection = [...selectedGroupIds, newGroupId];
              onConfirm(finalSelection);
              
              // Reset state
              setShowCreateGroup(false);
              setNewGroupName('');
              setNewGroupParentId('');
          } catch (error) {
              logger.error('Failed to create group:', error);
          }
      } 
      // 2. Normal confirm action
      else if (selectedGroupIds.length > 0) {
          onConfirm(selectedGroupIds);
      }
  };

  const getTranslatedName = (group: Group) => {
    if (!group.is_root || !group.type) return group.name;
    const keys: Record<string, string> = {
      family: 'groups.family',
      friends: 'groups.friends',
      work: 'groups.work',
    };
    return keys[group.type] ? t(keys[group.type]) : group.name;
  };

  if (!isOpen) return null;

  const isCreateModeValid = showCreateGroup && newGroupName.trim() && newGroupParentId;
  const isSelectionModeValid = !showCreateGroup && selectedGroupIds.length > 0;
  // Valid if either create mode is valid OR (not creating and has selection) OR (creating and has selection + valid form)
  // Actually simpler: 
  // If showing create form -> Must be valid form (will add to selection)
  // If NOT showing create form -> Must have selection
  // Wait, user might select groups AND fill form. Then button should do both.
  
  const isButtonDisabled = showCreateGroup 
      ? (!newGroupName.trim() || !newGroupParentId || createGroup.isPending) // Form invalid or saving
      : (selectedGroupIds.length === 0); // No selection

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FolderPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('groups.assignToGroup', 'הוספה לקבוצה')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('groups.assignCount', { count })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 font-medium">
                💡 {t('groups.bulkAssignExplanationAdd', 'בחר קבוצות להוספה. הקבוצות שתבחר יתווספו לקבוצות הקיימות של כל רשומה.')}
            </p>
        </div>

        <div className="mb-6 relative flex gap-2 items-start">
             <div className="flex-1">
                <MultiSelectGroups
                    groups={groupOptions}
                    selectedIds={selectedGroupIds}
                    onChange={(ids) => setSelectedGroupIds(ids)}
                    label={t('birthday.selectGroups', 'בחר קבוצות')}
                    placeholder={t('birthday.selectGroups', 'בחר קבוצות')}
                />
             </div>
             <button
                onClick={() => setShowCreateGroup(!showCreateGroup)}
                className={`mt-6 p-2 rounded-lg transition-colors border ${showCreateGroup ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'}`}
                title={t('groups.createSubgroup', 'Create New Group')}
             >
                <Plus className={`w-5 h-5 transition-transform ${showCreateGroup ? 'rotate-45' : ''}`} />
             </button>
        </div>

        {showCreateGroup && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('groups.createNewGroup')}</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('groups.groupName')}
                        </label>
                        <input 
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                            placeholder={t('groups.groupName')}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('groups.parentGroup')}
                        </label>
                        <select
                            value={newGroupParentId}
                            onChange={(e) => setNewGroupParentId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                        >
                            <option value="">{t('common.select')}</option>
                            {rootGroups.map(root => (
                                <option key={root.id} value={root.id}>
                                    {getTranslatedName(root)}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Inner Create Button Removed - Merged into Main Action */}
                </div>
            </div>
        )}

        <div className="flex gap-3 pt-4 sm:pt-0 border-t sm:border-0 border-gray-100 mt-auto"> 
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirmAction}
            disabled={isButtonDisabled}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {createGroup.isPending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : showCreateGroup ? (
                <>
                    <Plus className="w-4 h-4" />
                    {t('groups.createAndAssign', 'צור ושייך')}
                </>
            ) : (
                t('common.confirm', 'אישור')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
