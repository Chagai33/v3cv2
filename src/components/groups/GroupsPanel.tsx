import { logger } from "../../utils/logger";
import { Fragment, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useInitializeRootGroups } from '../../hooks/useGroups';
import { useBirthdays } from '../../hooks/useBirthdays';
import { groupService } from '../../services/group.service';
import { Layout } from '../layout/Layout';
import { Group, GroupType } from '../../types';
import { Plus, Edit, Trash2, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Toast } from '../common/Toast';
import { useToast } from '../../hooks/useToast';
import { DeleteGroupModal } from '../modals/DeleteGroupModal';

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
  const [deletingGroup, setDeletingGroup] = useState<{ id: string; name: string } | null>(null);
  const [deleteRecordCount, setDeleteRecordCount] = useState(0);
  const [formData, setFormData] = useState<{
    name: string;
    color: string;
    calendarPreference?: 'gregorian' | 'hebrew' | 'both';
  }>({
    name: '',
    color: GROUP_COLORS[0],
    calendarPreference: 'both',
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
      if (!birthday.group_id) return;
      map.set(birthday.group_id, (map.get(birthday.group_id) ?? 0) + 1);
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
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        color: GROUP_COLORS[0],
        calendarPreference: 'both',
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
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          groupId: editingGroup.id,
          data: formData,
        });
        success(t('groups.groupUpdated'));
      } else if (selectedParentId) {
        await createGroup.mutateAsync({
          name: formData.name,
          parentId: selectedParentId,
          color: formData.color,
          calendarPreference: formData.calendarPreference,
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
      const count = await groupService.getGroupBirthdaysCount(group.id);
      setDeleteRecordCount(count);
      setDeletingGroup({ id: group.id, name: group.name });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('groups.manageGroups')}</h2>
            <p className="text-gray-600 mt-2">{t('groups.manageDescription', 'ארגן את הרשומות שלך בקבוצות')}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            {i18n.language === 'he' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            <span className="hidden sm:inline">{t('common.back', 'חזור')}</span>
          </button>
        </div>

        {rootGroups.length > 0 ? (
          <Fragment>
            <div className="flex flex-wrap gap-3">
              {rootGroups.map((rootGroup) => {
                const isActive = rootGroup.id === activeRootId;
                const childGroups = childGroupsMap.get(rootGroup.id) ?? [];
                return (
                  <button
                    key={rootGroup.id}
                    onClick={() => setActiveRootId(rootGroup.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all shadow-sm ${
                      isActive
                        ? 'border-transparent text-white shadow-lg scale-[1.02]'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${rootGroup.color}, ${rootGroup.color}e6)`
                        : `${rootGroup.color}10`,
                    }}
                  >
                    <span className="font-semibold text-lg">{rootGroup.name}</span>
                    <span className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                      ({childGroups.length})
                    </span>
                  </button>
                );
              })}
            </div>

            {activeRootId && (
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
            )}
          </Fragment>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
            {t('groups.noRootGroups', 'לא נמצאו קבוצות על')}
          </div>
        )}

        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  {editingGroup ? t('groups.editGroup') : t('groups.addGroup')}
                </h3>
                <button
                  onClick={handleCloseForm}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('groups.groupName')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('groups.groupName')}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('groups.groupColor')}
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {GROUP_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-full aspect-square rounded-lg border-2 transition-all ${
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('birthday.calendarPreference')}
                  </label>
                  <select
                    value={formData.calendarPreference}
                    onChange={(e) => setFormData({ ...formData, calendarPreference: e.target.value as 'gregorian' | 'hebrew' | 'both' })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="both">{t('birthday.both')}</option>
                    <option value="gregorian">{t('birthday.gregorianOnly')}</option>
                    <option value="hebrew">{t('birthday.hebrewOnly')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('groups.preferenceExplanation', 'זה ישפיע על אופן הצגת ימי ההולדת בקבוצה זו')}
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-3 sm:px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={createGroup.isPending || updateGroup.isPending}
                    className="px-3 sm:px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  const totalRecords = childGroups.reduce((sum, group) => {
    return sum + (countsByGroup.get(group.id) ?? 0);
  }, 0);

  const childGroupsText = `(${childGroups.length})`;

  const recordCountText = isCountsLoading
    ? t('common.loading', 'טוען...')
    : `(${totalRecords})`;

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
      style={{
        borderWidth: '3px',
        borderStyle: 'solid',
        borderColor: rootGroup.color,
        background: `linear-gradient(to bottom, ${rootGroup.color}08, ${rootGroup.color}03, transparent)`
      }}
    >
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between" style={{ borderColor: `${rootGroup.color}40` }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${rootGroup.color}20` }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: rootGroup.color }}
            />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{rootGroup.name}</h3>
            <span className="text-sm text-gray-500">
              {isCountsLoading ? t('common.loading', 'טוען...') : `${t('groups.totalRecords', 'סה"כ רשומות')}: (${totalRecords})`}
            </span>
          </div>
        </div>
        <button
          onClick={onAddGroup}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-all hover:scale-105 shadow-sm"
          style={{ backgroundColor: rootGroup.color }}
        >
          <Plus className="w-4 h-4" />
          {t('groups.addGroup')}
        </button>
      </div>

      <div className="p-6 bg-gradient-to-b from-gray-50 to-white space-y-4">
        {isLoading || isCountsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: rootGroup.color }}></div>
          </div>
        ) : childGroups.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {t('groups.noGroups', { category: rootGroup.name })}
            </p>
            <button
              onClick={onAddGroup}
              className="px-4 py-2 text-white rounded-lg font-medium transition-all hover:scale-105 shadow-sm"
              style={{ backgroundColor: rootGroup.color }}
            >
              {t('groups.addGroup')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {childGroups.map((group) => {
              const groupCount = countsByGroup.get(group.id) ?? 0;
              return (
              <div
                key={group.id}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all hover:-translate-y-0.5 group"
                style={{
                  borderRightColor: group.color,
                  borderRightWidth: '3px'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${group.color}20` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">{group.name}</span>
                  </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                    {isCountsLoading ? t('common.loading', 'טוען...') : `(${groupCount})`}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditGroup(group)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteGroup(group)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
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
