import { logger } from "../../utils/logger";
import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Upload, FileText, Users, Plus, FolderPlus, Search } from 'lucide-react';
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
  const [defaultGroupId, setDefaultGroupId] = useState<string>('');
  const [rowGroupIds, setRowGroupIds] = useState<Map<number, string>>(new Map());
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedParentGroup, setSelectedParentGroup] = useState<string>('');
  const [editedData, setEditedData] = useState<CSVBirthdayRow[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  // Helper function to check if a name has invalid patterns (repeated characters)
  const isInvalidName = (name: string): boolean => {
    if (!name) return false;
    const cleanName = name.replace(/\s/g, '');
    if (cleanName.length <= 2) return false;
    
    // Check if has less than 2 unique characters
    const uniqueChars = new Set(cleanName.split(''));
    if (uniqueChars.size < 2) return true;
    
    // Check for sequence of same character (3+ times in a row)
    const repeatedPattern = /(.)\1{2,}/;
    if (repeatedPattern.test(cleanName)) return true;
    
    return false;
  };

  // Helper function to validate a single row
  // Errors = block import, Warnings = allow import but highlight
  const validateRow = (row: CSVBirthdayRow): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // First name: invalid pattern = error, missing = warning
    if (!row.firstName || row.firstName.trim().length < 2) {
      warnings.push(t('csvImport.validation.missingFirstName', 'חסר שם פרטי'));
    } else if (isInvalidName(row.firstName)) {
      errors.push(t('csvImport.validation.invalidFirstName', 'שם פרטי לא תקין'));
    }
    
    // Last name: missing or invalid = warning
    if (!row.lastName || row.lastName.trim().length === 0) {
      warnings.push(t('csvImport.validation.missingLastName', 'חסר שם משפחה'));
    } else if (isInvalidName(row.lastName)) {
      warnings.push(t('csvImport.validation.invalidLastName', 'שם משפחה לא תקין'));
    }
    
    // Birth date: missing = warning (can still import)
    if (!row.birthDate) {
      warnings.push(t('csvImport.validation.missingBirthDate', 'חסר תאריך'));
    }
    
    // Gender: missing = warning
    if (!row.gender) {
      warnings.push(t('csvImport.validation.missingGender', 'חסר מגדר'));
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  // Compute validation results based on edited data (re-validates when data changes)
  const validationResults = useMemo(() => {
    return editedData.map((row, index) => {
      const validation = validateRow(row);
      return {
        index,
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        isDuplicate: row.isDuplicate || false,
      };
    });
  }, [editedData, t]);

  useEffect(() => {
    if (isOpen && data.length > 0) {
      // Initialize edited data with original data
      setEditedData([...data]);
      
      // Initial selection based on original data validation
      const allValid = new Set(
        data
          .map((_, index) => index)
          .filter((index) => !data[index].validationErrors || data[index].validationErrors!.length === 0)
      );
      setSelectedRows(allValid);

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

  // Count rows with issues (errors or warnings)
  const issueCount = validationResults.filter(r => !r.isValid || r.warnings.length > 0 || r.isDuplicate).length;

  // Filter data based on search query and issue filter - MUST be before early return
  const filteredDataWithIndex = useMemo(() => {
    let result = editedData.map((row, index) => ({ row, originalIndex: index }));
    
    // Filter by issues if enabled - but ALWAYS show the row being edited
    if (showOnlyIssues) {
      result = result.filter(({ originalIndex }) => {
        // Always show the row being edited so it doesn't disappear while fixing
        if (editingRow === originalIndex) return true;
        
        const validation = validationResults[originalIndex];
        return validation && (!validation.isValid || validation.warnings.length > 0 || validation.isDuplicate);
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(({ row }) => {
        const searchableText = [
          row.firstName,
          row.lastName,
          row.originalLine,
          row.notes
        ].filter(Boolean).join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }
    
    return result;
  }, [editedData, searchQuery, showOnlyIssues, validationResults, editingRow]);

  // Computed values - MUST be before early return to keep hook order consistent
  const validCount = validationResults.filter((r) => r.isValid).length;
  const errorCount = validationResults.filter((r) => !r.isValid).length; // Rows with errors (block import)
  const warningCount = validationResults.filter((r) => r.isValid && r.warnings.length > 0).length; // Rows with warnings only
  const duplicateCount = validationResults.filter((r) => r.isDuplicate).length;

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

  // Handle save edit - validate and auto-select if valid
  const handleSaveEdit = (rowIndex: number) => {
    const row = editedData[rowIndex];
    const validation = validateRow(row);
    
    // If row is now valid, add it to selected rows
    if (validation.isValid && !selectedRows.has(rowIndex)) {
      const newSelected = new Set(selectedRows);
      newSelected.add(rowIndex);
      setSelectedRows(newSelected);
    }
    
    setEditingRow(null);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                {t('csvImport.previewTitle', 'תצוגה מקדימה - ייבוא קובץ')}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block">
                {t('csvImport.reviewData', 'בדוק את הנתונים לפני הייבוא')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors flex-shrink-0"
            disabled={isImporting}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
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
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-gray-600">{t('csvImport.errorRows', 'שגיאות')}:</span>
                <span className="font-semibold text-red-700">{errorCount}</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-gray-600">{t('csvImport.warningRows', 'אזהרות')}:</span>
                <span className="font-semibold text-yellow-700">{warningCount}</span>
              </div>
            )}
            {duplicateCount > 0 && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-gray-600">{t('csvImport.duplicates', 'כפילויות')}:</span>
                <span className="font-semibold text-orange-700">{duplicateCount}</span>
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
          {/* Issues filter + Search bar (RTL order: issues on right, search on left) */}
          <div className="mb-4 flex flex-col-reverse sm:flex-row gap-2">
            {issueCount > 0 && (
              <button
                onClick={() => setShowOnlyIssues(!showOnlyIssues)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 order-first sm:order-none ${
                  showOnlyIssues
                    ? 'bg-yellow-500 text-white'
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {showOnlyIssues 
                  ? t('csvImport.showAll', 'הצג הכל')
                  : t('csvImport.showIssuesOnly', 'לטיפול ({{count}})', { count: issueCount })
                }
              </button>
            )}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('csvImport.searchPlaceholder', 'חיפוש לפי שם...')}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-right"
                dir="rtl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

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
            {filteredDataWithIndex.map(({ row, originalIndex: index }) => {
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
                          onClick={() => isEditing ? handleSaveEdit(index) : setEditingRow(index)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors mt-5 ${
                            isEditing
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isEditing ? t('common.save', 'שמור') : t('common.edit', 'ערוך')}
                        </button>
                      </div>

                      {/* Show original line ONLY for rows with errors/warnings */}
                      {row.originalLine && row.lineNumber && (hasErrors || hasWarnings) && (
                        <div className="mt-2 p-2 bg-gray-100 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 font-medium mb-1">
                            {t('csvImport.originalLine', 'שורה מקורית')} #{row.lineNumber}:
                          </p>
                          <p className="text-xs text-gray-700 font-mono break-all" dir="auto">
                            {row.originalLine}
                          </p>
                        </div>
                      )}

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

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Left side buttons */}
            <div className="flex items-center gap-2">
              {showBackButton && onBack && (
                <button
                  onClick={onBack}
                  disabled={isImporting}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 border border-purple-300 text-purple-700 rounded-xl hover:bg-purple-50 transition-colors text-sm sm:text-base font-medium disabled:opacity-50"
                >
                  {t('import.backToImportShort', 'חזור')}
                </button>
              )}
              <button
                onClick={onClose}
                disabled={isImporting}
                className="px-3 sm:px-5 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors text-sm sm:text-base font-medium disabled:opacity-50"
              >
                {t('common.cancel', 'ביטול')}
              </button>
            </div>

            {/* Import button */}
            <button
              onClick={handleConfirm}
              disabled={selectedRows.size === 0 || isImporting}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all text-sm sm:text-base font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">{t('csvImport.importing', 'מייבא...')}</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>
                    {t('csvImport.import', 'ייבא')} ({selectedRows.size})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

