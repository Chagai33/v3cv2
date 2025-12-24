import { logger } from "../../utils/logger";
import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Upload, FileText, Users, Plus, FolderPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { CSVBirthdayRow, ValidationResult } from '../../types';
import { useGroups, useCreateGroup } from '../../hooks/useGroups';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

interface CSVImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CSVBirthdayRow[];
  onConfirm: (selectedRows: CSVBirthdayRow[], defaultGroupId?: string) => Promise<void>;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const CSVImportPreviewModal = ({
  isOpen,
  onClose,
  data,
  onConfirm,
  onBack,
  showBackButton = false,
}: CSVImportPreviewModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { data: allGroups = [], refetch: refetchGroups } = useGroups();
  const createGroup = useCreateGroup();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [defaultGroupId, setDefaultGroupId] = useState<string>('');
  const [rowGroupIds, setRowGroupIds] = useState<Map<number, string>>(new Map());
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedParentGroup, setSelectedParentGroup] = useState<string>('');
  const [editedData, setEditedData] = useState<CSVBirthdayRow[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && data.length > 0) {
      // Initialize edited data with original data
      setEditedData([...data]);
      
      const allValid = new Set(
        data
          .map((_, index) => index)
          .filter((index) => !data[index].validationErrors || data[index].validationErrors!.length === 0)
      );
      setSelectedRows(allValid);

      const results = data.map((row, index) => ({
        index,
        isValid: !row.validationErrors || row.validationErrors.length === 0,
        errors: row.validationErrors || [],
        warnings: row.warnings || [],
        isDuplicate: row.isDuplicate || false,
      }));
      setValidationResults(results);

      const initialRowGroups = new Map<number, string>();
      data.forEach((row, index) => {
        if (row.groupId) {
          initialRowGroups.set(index, row.groupId);
        }
      });
      setRowGroupIds(initialRowGroups);
    }
  }, [isOpen, data]);

  const rootGroups = allGroups.filter(g => g.is_root);
  const childGroups = allGroups.filter(g => !g.is_root);
  
  // Helper function to get translated root group name
  const getTranslatedRootName = (group: any): string => {
    if (!group.is_root || !group.type) return group.name;
    const translationKeys: Record<string, string> = {
      family: 'groups.family',
      friends: 'groups.friends',
      work: 'groups.work',
    };
    const key = translationKeys[group.type];
    return key ? t(key) : group.name;
  };
  
  // Create a map of root group IDs to translated names for optgroup labels
  const translatedRootNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    rootGroups.forEach(root => {
      map.set(root.id, getTranslatedRootName(root));
    });
    return map;
  }, [rootGroups, t]);

  if (!isOpen) return null;

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === validationResults.filter(r => r.isValid).length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(validationResults.filter(r => r.isValid).map(r => r.index)));
    }
  };

  const handleConfirm = async () => {
    setIsImporting(true);
    try {
      const rowsToImport = Array.from(selectedRows).map((index) => {
        const row = editedData[index]; // Use edited data instead of original
        const rowGroupId = rowGroupIds.get(index) || row.groupId;
        if (rowGroupId) {
          return { ...row, groupId: rowGroupId };
        } else if (defaultGroupId) {
          return { ...row, groupId: defaultGroupId };
        }
        return row;
      });
      await onConfirm(rowsToImport, defaultGroupId);
      onClose();
    } catch (error) {
      logger.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const updateRowField = (rowIndex: number, field: keyof CSVBirthdayRow, value: any) => {
    const newData = [...editedData];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setEditedData(newData);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !selectedParentGroup) return;

    try {
      await createGroup.mutateAsync({
        name: newGroupName.trim(),
        parentId: selectedParentGroup,
      });
      await refetchGroups();
      setNewGroupName('');
      setSelectedParentGroup('');
      setShowGroupCreator(false);
    } catch (error) {
      logger.error('Failed to create group:', error);
      alert(t('common.error'));
    }
  };

  const updateRowGroup = (rowIndex: number, groupId: string) => {
    const newMap = new Map(rowGroupIds);
    if (groupId) {
      newMap.set(rowIndex, groupId);
    } else {
      newMap.delete(rowIndex);
    }
    setRowGroupIds(newMap);
  };

  const validCount = validationResults.filter((r) => r.isValid).length;
  const invalidCount = validationResults.length - validCount;
  const duplicateCount = validationResults.filter((r) => r.isDuplicate).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('csvImport.previewTitle', 'תצוגה מקדימה - ייבוא קובץ')}
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {t('csvImport.reviewData', 'בדוק את הנתונים לפני הייבוא')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            disabled={isImporting}
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-gray-600">{t('csvImport.totalRows', 'סך הכל שורות')}:</span>
              <span className="font-semibold text-gray-900">{data.length}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              <span className="text-gray-600">{t('csvImport.validRows', 'שורות תקינות')}:</span>
              <span className="font-semibold text-green-700">{validCount}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-gray-600">{t('csvImport.invalidRows', 'שורות לא תקינות')}:</span>
              <span className="font-semibold text-red-700">{invalidCount}</span>
            </div>
            {duplicateCount > 0 && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-gray-600">{t('csvImport.duplicates', 'כפילויות אפשריות')}:</span>
                <span className="font-semibold text-yellow-700">{duplicateCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Users className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <label className="text-xs text-gray-600 whitespace-nowrap">
                {t('csvImport.defaultGroup', 'קבוצת ברירת מחדל')}:
              </label>
              <select
                value={defaultGroupId}
                onChange={(e) => setDefaultGroupId(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                title={t('csvImport.groupNote', 'קבוצה זו תוחל על כל הרשומות שלא הוגדרה להן קבוצה בקובץ')}
              >
                <option value="">
                  {t('csvImport.noDefaultGroup', 'ללא קבוצת ברירת מחדל')}
                </option>
                {rootGroups.map((root) => {
                  const children = childGroups.filter(c => c.parent_id === root.id);
                  return (
                    <optgroup key={root.id} label={translatedRootNamesMap.get(root.id) || root.name}>
                      {children.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <button
              onClick={() => setShowGroupCreator(!showGroupCreator)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('csvImport.createGroup', 'צור קבוצה')}
            </button>
          </div>

          {showGroupCreator && (
            <div className="mt-3 bg-white rounded-lg p-3 border border-gray-300 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <FolderPlus className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('csvImport.createSubgroupTitle', 'צור תת-קבוצה')}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('csvImport.subgroupNameLabel', 'שם התת-קבוצה')} *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newGroupName.trim() && selectedParentGroup) {
                        handleCreateGroup();
                      }
                    }}
                    placeholder={t('csvImport.subgroupPlaceholder', 'למשל: יחיאל, עמיתי צוות, וכו...')}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('csvImport.underWhichGroup', 'תחת איזו קבוצה ראשית?')} *
                  </label>
                  <select
                    value={selectedParentGroup}
                    onChange={(e) => setSelectedParentGroup(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">{t('birthday.selectGroup')}</option>
                    {rootGroups.map((root) => (
                      <option key={root.id} value={root.id}>
                        {translatedRootNamesMap.get(root.id) || root.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim() || !selectedParentGroup || createGroup.isPending}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 text-xs font-medium flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {createGroup.isPending ? t('common.loading', 'טוען...') : t('csvImport.addSubgroup', 'הוסף תת-קבוצה')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupCreator(false);
                    setNewGroupName('');
                    setSelectedParentGroup('');
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-xs font-medium"
                >
                  {t('common.close', 'סגור')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6 min-h-0">
          <div className="mb-4 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRows.size === validCount && validCount > 0}
                onChange={toggleAll}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {t('csvImport.selectAll', 'בחר הכל')} ({selectedRows.size} {t('csvImport.selected', 'נבחרו')})
              </span>
            </label>
          </div>

          <div className="space-y-3">
            {editedData.map((row, index) => {
              const validation = validationResults[index];
              const isSelected = selectedRows.has(index);
              const hasErrors = validation && !validation.isValid;
              const hasWarnings = validation && validation.warnings.length > 0;
              const isEditing = editingRow === index;

              return (
                <div
                  key={index}
                  className={`border rounded-xl p-4 transition-all ${
                    hasErrors
                      ? 'border-red-300 bg-red-50'
                      : hasWarnings
                      ? 'border-yellow-300 bg-yellow-50'
                      : validation?.isDuplicate
                      ? 'border-orange-300 bg-orange-50'
                      : isSelected
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(index)}
                        disabled={hasErrors}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.firstName', 'שם פרטי')}
                          </p>
                          {isEditing ? (
                            <input
                              type="text"
                              value={row.firstName || ''}
                              onChange={(e) => updateRowField(index, 'firstName', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {row.firstName || '-'}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.lastName', 'שם משפחה')}
                          </p>
                          {isEditing ? (
                            <input
                              type="text"
                              value={row.lastName || ''}
                              onChange={(e) => updateRowField(index, 'lastName', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {row.lastName || '-'}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.birthDate', 'תאריך לידה')}
                          </p>
                          {isEditing ? (
                            <input
                              type="date"
                              value={row.birthDate || ''}
                              onChange={(e) => updateRowField(index, 'birthDate', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 truncate">
                              {row.birthDate || '-'}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.gender', 'מגדר')}
                          </p>
                          {isEditing ? (
                            <select
                              value={row.gender || ''}
                              onChange={(e) => updateRowField(index, 'gender', e.target.value || undefined)}
                              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              <option value="">-</option>
                              <option value="male">{t('common.male', 'זכר')}</option>
                              <option value="female">{t('common.female', 'נקבה')}</option>
                              <option value="other">{t('common.other', 'אחר')}</option>
                            </select>
                          ) : (
                            <p className="text-sm text-gray-900">
                              {row.gender ? t(`common.${row.gender}`, row.gender) : '-'}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.afterSunset', 'אחרי שקיעה')}
                          </p>
                          {isEditing ? (
                            <select
                              value={row.afterSunset ? 'yes' : 'no'}
                              onChange={(e) => updateRowField(index, 'afterSunset', e.target.value === 'yes')}
                              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              <option value="no">{t('common.no', 'לא')}</option>
                              <option value="yes">{t('common.yes', 'כן')}</option>
                            </select>
                          ) : (
                            <p className="text-sm text-gray-900">
                              {row.afterSunset ? t('common.yes', 'כן') : t('common.no', 'לא')}
                            </p>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('birthday.notes', 'הערות')}
                          </p>
                          <textarea
                            value={row.notes || ''}
                            onChange={(e) => updateRowField(index, 'notes', e.target.value || undefined)}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 resize-none"
                            rows={2}
                            placeholder={t('birthday.notes', 'הערות')}
                          />
                        </div>
                      )}

                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 font-medium mb-1">
                            <Users className="w-3 h-3 inline me-1" />
                            {t('csvImport.rowGroup', 'קבוצה')}
                          </label>
                          <select
                            value={rowGroupIds.get(index) || row.groupId || ''}
                            onChange={(e) => updateRowGroup(index, e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          >
                            <option value="">
                              {t('csvImport.noGroup', 'ללא קבוצה (ישתמש בברירת מחדל)')}
                            </option>
                            {rootGroups.map((root) => {
                              const children = childGroups.filter(c => c.parent_id === root.id);
                              return (
                                <optgroup key={root.id} label={translatedRootNamesMap.get(root.id) || root.name}>
                                  {children.map((group) => (
                                    <option key={group.id} value={group.id}>
                                      {group.name}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                        </div>
                        
                        <button
                          onClick={() => setEditingRow(isEditing ? null : index)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors mt-5 ${
                            isEditing
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isEditing ? t('common.save', 'שמור') : t('common.edit', 'ערוך')}
                        </button>
                      </div>

                      {validation && (validation.errors.length > 0 || validation.warnings.length > 0 || validation.isDuplicate) && (
                        <div className="space-y-1 mt-3">
                          {validation.errors.map((error, i) => (
                            <div key={`error-${i}`} className="flex items-start gap-2 text-xs text-red-700">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{error}</span>
                            </div>
                          ))}

                          {validation.warnings.map((warning, i) => (
                            <div key={`warning-${i}`} className="flex items-start gap-2 text-xs text-yellow-700">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{warning}</span>
                            </div>
                          ))}

                          {validation.isDuplicate && (
                            <div className="flex items-start gap-2 text-xs text-orange-700">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{t('csvImport.duplicateWarning', 'ייתכן שרשומה זו כבר קיימת במערכת')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                disabled={isImporting}
                className="px-6 py-2.5 border border-purple-300 text-purple-700 rounded-xl hover:bg-purple-50 transition-colors font-medium disabled:opacity-50"
              >
                {t('import.backToImport', 'חזור לייבוא')}
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
            >
              {t('common.cancel', 'ביטול')}
            </button>
          </div>

          <button
            onClick={handleConfirm}
            disabled={selectedRows.size === 0 || isImporting}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('csvImport.importing', 'מייבא...')}</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>
                  {t('csvImport.import', 'ייבא')} ({selectedRows.size})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

