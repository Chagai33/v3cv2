import { logger } from "../../utils/logger";
import { Fragment, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useInitializeRootGroups } from '../../hooks/useGroups';
import { useBirthdays } from '../../hooks/useBirthdays';
import { groupService } from '../../services/group.service';
import { Layout } from '../layout/Layout';
import { Group, GroupType } from '../../types';
import { Plus, Edit, Trash2, X, ArrowRight, ArrowLeft, Globe } from 'lucide-react';
import { Toast } from '../common/Toast';
import { useToast } from '../../hooks/useToast';
import { DeleteGroupModal } from '../modals/DeleteGroupModal';
import { useTranslatedRootGroupName } from '../../utils/groupNameTranslator';
import { FloatingBackButton } from '../common/FloatingBackButton';

interface RootGroupButtonProps {
  rootGroup: Group;
  isActive: boolean;
  childGroupsCount: number;
  onClick: () => void;
}

const RootGroupButton: React.FC<RootGroupButtonProps> = ({ rootGroup, isActive, childGroupsCount, onClick }) => {
  const translatedName = useTranslatedRootGroupName(rootGroup);
  
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center gap-0.5 p-1 sm:p-1.5 rounded-lg border-2 transition-all shadow-sm hover:shadow-md ${
        isActive
          ? 'border-transparent text-white shadow-md scale-105'
          : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white/80 backdrop-blur-sm'
      }`}
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${rootGroup.color}, ${rootGroup.color}e6)`
          : `${rootGroup.color}10`,
      }}
    >
      <div 
        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
          isActive ? 'bg-white/20' : 'bg-white'
        }`}
        style={isActive ? {} : { backgroundColor: `${rootGroup.color}20` }}
      >
        <div
          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
          style={{ backgroundColor: rootGroup.color }}
        />
      </div>
      <span className={`font-semibold text-[10px] sm:text-xs text-center leading-tight ${isActive ? 'text-white' : 'text-gray-900'}`}>
        {translatedName}
      </span>
      <span className={`text-[7px] sm:text-[8px] ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
        ({childGroupsCount})
      </span>
    </button>
  );
};

const GROUP_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
];

export const GroupsPanel = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: allGroups = [], isLoading } = useGroups();
  const { data: birthdays = [], isLoading: isBirthdaysLoading } = useBirthdays();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const initializeRootGroups = useInitializeRootGroups();
  const { toasts, hideToast, success, error } = useToast();

  const [activeRootId, setActiveRootId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<{ id: string; name: string; tenant_id: string } | null>(null);
  const [deleteRecordCount, setDeleteRecordCount] = useState(0);
  const [formData, setFormData] = useState<{
    name: string;
    color: string;
    calendarPreference?: 'gregorian' | 'hebrew' | 'both';
    isGuestPortalEnabled: boolean;
  }>({
    name: '',
    color: GROUP_COLORS[0],
    calendarPreference: 'both',
    isGuestPortalEnabled: true,
  });

  const rootGroups = useMemo(() => {
    const order: Record<GroupType, number> = {
      family: 0,
      friends: 1,
      work: 2,
    };

    return allGroups
      .filter(group => group.is_root)
      .sort((a, b) => {
        const orderA = a.type ? order[a.type] ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
        const orderB = b.type ? order[b.type] ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return a.name.localeCompare(b.name);
      });
  }, [allGroups]);

  const childGroupsMap = useMemo(() => {
    const map = new Map<string, Group[]>();
    allGroups
      .filter(group => !group.is_root && group.parent_id)
      .forEach(group => {
        const parentId = group.parent_id as string;
        const list = map.get(parentId) ?? [];
        list.push(group);
        map.set(parentId, list);
      });

    for (const [parentId, groups] of map.entries()) {
      groups.sort((a, b) => a.name.localeCompare(b.name));
      map.set(parentId, groups);
    }

    return map;
  }, [allGroups]);

  const countsByGroup = useMemo(() => {
    const map = new Map<string, number>();
    birthdays.forEach((birthday) => {
      const groupIds = birthday.group_ids || (birthday.group_id ? [birthday.group_id] : []);
      groupIds.forEach((groupId) => {
        map.set(groupId, (map.get(groupId) ?? 0) + 1);
      });
    });
    return map;
  }, [birthdays]);

  useEffect(() => {
    if (!activeRootId && rootGroups.length > 0) {
      const defaultGroup =
        rootGroups.find(group => group.type === 'family') ??
        rootGroups[0];
      setActiveRootId(defaultGroup.id);
      return;
    }

    if (activeRootId && rootGroups.length > 0) {
      const exists = rootGroups.some(group => group.id === activeRootId);
      if (!exists) {
        const fallbackGroup =
          rootGroups.find(group => group.type === 'family') ??
          rootGroups[0];
        setActiveRootId(fallbackGroup.id);
      }
    }
  }, [rootGroups, activeRootId]);

  useEffect(() => {
    if (rootGroups.length === 0 && allGroups.length === 0 && !isLoading && !initializeRootGroups.isPending) {
      initializeRootGroups.mutate('he');
    }
  }, [rootGroups.length, allGroups.length, isLoading, initializeRootGroups]);

  const handleOpenForm = (parentId: string, group?: Group) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        color: group.color,
        calendarPreference: group.calendar_preference || 'both',
        isGuestPortalEnabled: group.is_guest_portal_enabled ?? true,
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        color: GROUP_COLORS[0],
        calendarPreference: 'both',
        isGuestPortalEnabled: true,
      });
    }
    setSelectedParentId(parentId);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGroup(null);
    setSelectedParentId(null);
    setFormData({
      name: '',
      color: GROUP_COLORS[0],
      calendarPreference: 'both',
      isGuestPortalEnabled: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          groupId: editingGroup.id,
          data: {
            ...formData,
            is_guest_portal_enabled: formData.isGuestPortalEnabled,
          },
        });
        success(t('groups.groupUpdated'));
      } else if (selectedParentId) {
        await createGroup.mutateAsync({
          name: formData.name,
          parentId: selectedParentId,
          color: formData.color,
          calendarPreference: formData.calendarPreference,
          is_guest_portal_enabled: formData.isGuestPortalEnabled,
        });
        success(t('groups.groupCreated'));
      }
      handleCloseForm();
    } catch (err) {
      error(t('common.error'));
      logger.error('Error saving group:', err);
    }
  };

  const handleDeleteClick = async (group: Group) => {
    try {
      const count = await groupService.getGroupBirthdaysCount(group.id, group.tenant_id);
      setDeleteRecordCount(count);
      setDeletingGroup({ id: group.id, name: group.name, tenant_id: group.tenant_id });
    } catch (err) {
      error(t('common.error'));
      logger.error('Error getting birthdays count:', err);
    }
  };

  const handleDeleteConfirm = async (deleteBirthdays: boolean) => {
    if (!deletingGroup) return;

    try {
      await deleteGroup.mutateAsync({
        groupId: deletingGroup.id,
        tenantId: deletingGroup.tenant_id,
        deleteBirthdays,
      });
      success(t('groups.groupDeleted'));
      setDeletingGroup(null);
    } catch (err) {
      error(t('common.error'));
      logger.error('Error deleting group:', err);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-2 sm:space-y-2.5 pb-24 sm:pb-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{t('groups.manageGroups')}</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">{t('groups.manageDescription')}</p>
          </div>
          {/* Desktop Back Button */}
          <button
            onClick={() => navigate('/')}
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors shadow-sm flex-shrink-0"
          >
            {i18n.language === 'he' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            <span className="hidden sm:inline">{t('common.back')}</span>
          </button>
        </div>

        {/* Mobile Floating Back Button */}
        <FloatingBackButton 
          onClick={() => navigate('/')} 
          position="bottom-left"
        />

        {rootGroups.length > 0 ? (
          <Fragment>
            {/* קבוצות העל - Grid responsive עם מספר עמודות משתנה לפי גודל המסך */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-2">
              {rootGroups.map((rootGroup) => {
                const isActive = rootGroup.id === activeRootId;
                const childGroups = childGroupsMap.get(rootGroup.id) ?? [];
                return (
                  <RootGroupButton
                    key={rootGroup.id}
                    rootGroup={rootGroup}
                    isActive={isActive}
                    childGroupsCount={childGroups.length}
                    onClick={() => setActiveRootId(rootGroup.id)}
                  />
                );
              })}
            </div>

            {activeRootId && (
              <>
                <CategorySection
                  key={activeRootId}
                  rootGroup={rootGroups.find(group => group.id === activeRootId)!}
                  childGroups={childGroupsMap.get(activeRootId) ?? []}
                  isLoading={isLoading}
                  isCountsLoading={isBirthdaysLoading}
                  countsByGroup={countsByGroup}
                  onAddGroup={() => handleOpenForm(activeRootId)}
                  onEditGroup={(group) => handleOpenForm(activeRootId, group)}
                  onDeleteGroup={handleDeleteClick}
                />
                
                {/* כפתור הוספה במובייל - FloatingDock style */}
                <div className="fixed bottom-6 right-6 z-40 sm:hidden">
                  <button
                    onClick={() => handleOpenForm(activeRootId)}
                    className="p-4 bg-white/80 backdrop-blur-md border border-white/30 rounded-full shadow-xl hover:bg-white/90 transition-all active:scale-95 ring-1 ring-black/5"
                    style={{ 
                      backgroundColor: rootGroups.find(g => g.id === activeRootId)?.color + 'CC' || 'rgba(59, 130, 246, 0.8)',
                      borderColor: rootGroups.find(g => g.id === activeRootId)?.color || '#3b82f6'
                    }}
                    aria-label={t('groups.addGroup')}
                  >
                    <Plus className="w-6 h-6 text-white" />
                  </button>
                </div>
              </>
            )}
          </Fragment>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 sm:p-8 text-center text-gray-600">
            <p className="text-sm sm:text-base">{t('groups.noRootGroups')}</p>
          </div>
        )}

        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                  {editingGroup ? t('groups.editGroup') : t('groups.addGroup')}
                </h3>
                <button
                  onClick={handleCloseForm}
                  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    {t('groups.groupName')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('groups.groupName')}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    {t('groups.groupColor')}
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                    {GROUP_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-full aspect-square rounded-md sm:rounded-lg border-2 transition-all ${
                          formData.color === color
                            ? 'border-gray-900 scale-110'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    {t('birthday.calendarPreference')}
                  </label>
                  <select
                    value={formData.calendarPreference}
                    onChange={(e) => setFormData({ ...formData, calendarPreference: e.target.value as 'gregorian' | 'hebrew' | 'both' })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="both">{t('birthday.both')}</option>
                    <option value="gregorian">{t('birthday.gregorianOnly')}</option>
                    <option value="hebrew">{t('birthday.hebrewOnly')}</option>
                  </select>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                    {t('groups.preferenceExplanation')}
                  </p>
                </div>

                {/* Guest Portal Toggle */}
                <div className={`flex items-start gap-3 border rounded-lg p-3 ${
                   (() => {
                       // Check if parent has portal disabled
                       if (selectedParentId) {
                           const parent = allGroups.find(g => g.id === selectedParentId);
                           if (parent && parent.is_guest_portal_enabled === false) {
                               return "bg-amber-50 border-amber-200";
                           }
                       }
                       return "bg-purple-50 border-purple-100";
                   })()
                }`}>
                    <div className={`mt-0.5 ${
                       (() => {
                           if (selectedParentId) {
                               const parent = allGroups.find(g => g.id === selectedParentId);
                               if (parent && parent.is_guest_portal_enabled === false) {
                                   return "text-amber-600";
                               }
                           }
                           return "text-purple-600";
                       })()
                    }`}>
                        <Globe className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-900">
                                {t('groups.guestPortalAccess', 'Guest Portal Access')}
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.isGuestPortalEnabled}
                                    onChange={(e) => setFormData({ ...formData, isGuestPortalEnabled: e.target.checked })}
                                />
                                <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                                    (() => {
                                       if (selectedParentId) {
                                           const parent = allGroups.find(g => g.id === selectedParentId);
                                           if (parent && parent.is_guest_portal_enabled === false) {
                                               return "peer-focus:ring-amber-300 peer-checked:bg-amber-500";
                                           }
                                       }
                                       return "peer-focus:ring-purple-300 peer-checked:bg-purple-600";
                                    })()
                                }`}></div>
                            </label>
                        </div>
                        
                        {/* Description / Warning */}
                        {(() => {
                             if (selectedParentId) {
                                 const parent = allGroups.find(g => g.id === selectedParentId);
                                 if (parent && parent.is_guest_portal_enabled === false) {
                                     return (
                                         <p className="text-xs text-amber-700 mt-1 font-medium">
                                             ⚠️ גישה חסומה: קבוצת האב ({useTranslatedRootGroupName(parent)}) חוסמת גישה לפורטל. הפעלת המתג תהיה אפקטיבית רק כשהאב יופעל.
                                         </p>
                                     );
                                 }
                             }
                             return (
                                 <p className="text-xs text-gray-500 mt-1">
                                     {t('groups.guestPortalDescription', 'Allow access to birthdays in this group via the guest portal.')}
                                 </p>
                             );
                        })()}
                    </div>
                </div>

                <div className="flex gap-2 sm:gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={createGroup.isPending || updateGroup.isPending}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createGroup.isPending || updateGroup.isPending
                      ? t('common.loading')
                      : t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <DeleteGroupModal
          isOpen={!!deletingGroup}
          onClose={() => setDeletingGroup(null)}
          onConfirm={handleDeleteConfirm}
          groupName={deletingGroup?.name || ''}
          recordCount={deleteRecordCount}
        />

        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </Layout>
  );
};

interface CategorySectionProps {
  rootGroup: Group;
  childGroups: Group[];
  isLoading: boolean;
  isCountsLoading: boolean;
  countsByGroup: Map<string, number>;
  onAddGroup: () => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
}

const CategorySection = ({
  rootGroup,
  childGroups,
  isLoading,
  isCountsLoading,
  countsByGroup,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
}: CategorySectionProps) => {
  const { t } = useTranslation();
  const translatedRootName = useTranslatedRootGroupName(rootGroup);
  const totalRecords = childGroups.reduce((sum, group) => {
    return sum + (countsByGroup.get(group.id) ?? 0);
  }, 0);

  const childGroupsText = `(${childGroups.length})`;

  const recordCountText = isCountsLoading
    ? t('common.loading')
    : `(${totalRecords})`;

  return (
    <div 
      className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden"
      style={{
        borderWidth: '3px',
        borderStyle: 'solid',
        borderColor: rootGroup.color,
        background: `linear-gradient(to bottom, ${rootGroup.color}08, ${rootGroup.color}03, transparent)`
      }}
    >
      <div className="px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0" style={{ borderColor: `${rootGroup.color}40` }}>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${rootGroup.color}20` }}
          >
            <div
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
              style={{ backgroundColor: rootGroup.color }}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{translatedRootName}</h3>
            <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
              {isCountsLoading ? t('common.loading') : `${t('groups.totalRecords')}: (${totalRecords})`}
            </span>
          </div>
        </div>
        <button
          onClick={onAddGroup}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
          <span className="hidden sm:inline">{t('groups.addGroup')}</span>
          <span className="sm:hidden">{t('groups.addGroup').split(' ')[0]}</span>
        </button>
      </div>

      <div className="p-3 sm:p-4 md:p-5 bg-gradient-to-b from-gray-50 to-white space-y-2.5 sm:space-y-3">
        {isLoading || isCountsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: rootGroup.color }}></div>
          </div>
        ) : childGroups.length === 0 ? (
          <div className="text-center py-6 sm:py-10">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 px-2">
              {t('groups.noGroups', { category: translatedRootName })}
            </p>
            <button
              onClick={onAddGroup}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-white rounded-lg text-xs sm:text-sm font-medium transition-all hover:scale-105 shadow-sm"
              style={{ backgroundColor: rootGroup.color }}
            >
              {t('groups.addGroup')}
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-3 md:gap-4">
            {childGroups.map((group) => {
              const groupCount = countsByGroup.get(group.id) ?? 0;
              return (
              <div
                key={group.id}
                className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 hover:shadow-lg transition-all hover:-translate-y-0.5 group"
                style={{
                  borderRightColor: group.color,
                  borderRightWidth: '3px'
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${group.color}20` }}
                    >
                      <div
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base truncate">{group.name}</span>
                  </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-600 bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg whitespace-nowrap">
                    {isCountsLoading ? t('common.loading') : `(${groupCount})`}
                  </span>
                  <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditGroup(group)}
                      className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteGroup(group)}
                      className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
