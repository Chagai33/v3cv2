import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../layout/Layout';
import { useGelt, useUpdateGelt, useResetGelt } from '../../hooks/useGelt';
import { useSaveGeltTemplate, useUpdateGeltTemplate, useDefaultGeltTemplate, useGeltTemplates } from '../../hooks/useGeltTemplates';
import { GeltTemplate } from '../../types/gelt';
import { useBirthdays } from '../../hooks/useBirthdays';
import { GeltChildrenList } from './GeltChildrenList';
import { GeltAgeGroupsList } from './GeltAgeGroupsList';
import { GeltBudgetConfigModal } from './GeltBudgetConfigModal';
import { GeltCalculationResults } from './GeltCalculationResults';
import { GeltImportModal } from './GeltImportModal';
import { GeltTemplateModal } from './GeltTemplateModal';
import { GeltLoadTemplateModal } from './GeltLoadTemplateModal';
import { GeltGroupChildrenModal } from './GeltGroupChildrenModal';
import { Button } from '../common/Button';
import { 
  calculateBudget, 
  resetChildAge, 
  excludeChild,
  updateAgeGroup,
  updateBudgetConfig,
  updateChildAge,
} from '../../utils/geltCalculations';
import { exportToCSV, prepareExportData } from '../../utils/geltExport';
import { Child, AgeGroup, BudgetConfig, GeltState } from '../../types/gelt';
import { Download, Upload, RotateCcw, Users, Settings, Calculator, ChevronDown, ChevronUp, Save, FolderOpen, Info, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { DEFAULT_AGE_GROUPS, DEFAULT_BUDGET_CONFIG } from '../../utils/geltConstants';

export const GeltPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data: geltState, isLoading } = useGelt();
  const updateGelt = useUpdateGelt();
  const resetGelt = useResetGelt();
  const { data: birthdays = [] } = useBirthdays();
  const { success, error: showError } = useToast();
  const { data: defaultTemplate, isLoading: isLoadingDefaultTemplate } = useDefaultGeltTemplate();
  const { data: existingTemplates = [] } = useGeltTemplates();

  const [localState, setLocalState] = useState<GeltState | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showChildrenList, setShowChildrenList] = useState(false);
  const [showBudgetConfigModal, setShowBudgetConfigModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showCalculationResults, setShowCalculationResults] = useState(true);
  const [showGroupChildrenModal, setShowGroupChildrenModal] = useState(false);
  const [selectedGroupForChildren, setSelectedGroupForChildren] = useState<AgeGroup | null>(null);
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null); // Track which template was loaded
  const [loadedTemplate, setLoadedTemplate] = useState<GeltTemplate | null>(null); // Track the full loaded template
  
  const saveTemplate = useSaveGeltTemplate();
  const updateTemplate = useUpdateGeltTemplate();
  const hasInitializedRef = useRef(false);
  const skipNextAutoSaveRef = useRef(false);
  const lastSavedStateRef = useRef<string | null>(null);

  // Helper function to check if current state matches a template
  // This is used to identify which template is currently loaded, even after refresh
  const findMatchingTemplate = (state: GeltState | null, templates: GeltTemplate[]): GeltTemplate | null => {
    if (!state) return null;
    
    // Check each template to see if it matches the current state
    for (const template of templates) {
      // Compare ageGroups (id, minAge, maxAge, amountPerChild, isIncluded)
      if (state.ageGroups.length !== template.ageGroups.length) continue;
      
      const ageGroupsMatch = state.ageGroups.every(stateGroup => {
        const templateGroup = template.ageGroups.find(g => g.id === stateGroup.id);
        if (!templateGroup) return false;
        return templateGroup.minAge === stateGroup.minAge &&
               templateGroup.maxAge === stateGroup.maxAge &&
               templateGroup.amountPerChild === stateGroup.amountPerChild &&
               templateGroup.isIncluded === stateGroup.isIncluded;
      });
      
      if (!ageGroupsMatch) continue;
      
      // Compare budgetConfig
      const budgetConfigMatch = 
        state.budgetConfig.participants === template.budgetConfig.participants &&
        state.budgetConfig.allowedOverflowPercentage === template.budgetConfig.allowedOverflowPercentage &&
        (state.budgetConfig.customBudget ?? null) === (template.budgetConfig.customBudget ?? null);
      
      if (!budgetConfigMatch) continue;
      
      // Compare customGroupSettings
      const stateHasCustomSettings = state.customGroupSettings !== null && state.customGroupSettings.length > 0;
      const templateHasCustomSettings = template.customGroupSettings !== null && template.customGroupSettings.length > 0;
      
      if (stateHasCustomSettings !== templateHasCustomSettings) continue;
      
      if (stateHasCustomSettings && templateHasCustomSettings) {
        // Both have custom settings, compare them
        if (state.customGroupSettings!.length !== template.customGroupSettings!.length) continue;
        
        const customSettingsMatch = state.customGroupSettings!.every(stateGroup => {
          const templateGroup = template.customGroupSettings!.find(g => g.id === stateGroup.id);
          if (!templateGroup) return false;
          return templateGroup.minAge === stateGroup.minAge &&
                 templateGroup.maxAge === stateGroup.maxAge &&
                 templateGroup.amountPerChild === stateGroup.amountPerChild &&
                 templateGroup.isIncluded === stateGroup.isIncluded;
        });
        
        if (!customSettingsMatch) continue;
      }
      
      // All checks passed - this template matches!
      return template;
    }
    
    return null;
  };

  // Helper function to check if state is empty/reset
  // State is considered empty if it has no children and no custom configurations
  const isStateEmpty = (state: GeltState): boolean => {
    // Check if there are any children
    if (state.children.length > 0 || state.includedChildren.length > 0) {
      return false;
    }
    
    // Check if customGroupSettings exists (indicates custom budget was used)
    if (state.customGroupSettings !== null) {
      return false;
    }
    
    // Check if budgetConfig has custom budget
    if (state.budgetConfig.customBudget && state.budgetConfig.customBudget > 0) {
      return false;
    }
    
    // Check if ageGroups differ from defaults in meaningful ways
    // We only check if the structure is the same, not the isIncluded flags
    // because isIncluded can change without making the state "non-empty"
    const defaultGroupIds = new Set(DEFAULT_AGE_GROUPS.map(g => g.id));
    const stateGroupIds = new Set(state.ageGroups.map(g => g.id));
    
    // If group IDs don't match, state is not empty
    if (defaultGroupIds.size !== stateGroupIds.size || 
        !Array.from(defaultGroupIds).every(id => stateGroupIds.has(id))) {
      return false;
    }
    
    // Check if any group has different minAge, maxAge, or amountPerChild
    for (const defaultGroup of DEFAULT_AGE_GROUPS) {
      const stateGroup = state.ageGroups.find(g => g.id === defaultGroup.id);
      if (!stateGroup) return false;
      if (stateGroup.minAge !== defaultGroup.minAge ||
          stateGroup.maxAge !== defaultGroup.maxAge ||
          stateGroup.amountPerChild !== defaultGroup.amountPerChild) {
        return false;
      }
    }
    
    // Check if budgetConfig matches defaults (excluding customBudget)
    if (state.budgetConfig.participants !== DEFAULT_BUDGET_CONFIG.participants ||
        state.budgetConfig.allowedOverflowPercentage !== DEFAULT_BUDGET_CONFIG.allowedOverflowPercentage) {
      return false;
    }
    
    return true;
  };

  // Find matching template from current state (for after refresh)
  // Priority: 1. loadedTemplate (if user loaded a template), 2. loadedTemplateId (find by ID), 3. findMatchingTemplate (match by state)
  const matchingTemplate = useMemo(() => {
    // First priority: if we have loadedTemplate, use it (even if state changed)
    if (loadedTemplate) return loadedTemplate;
    
    // Second priority: if we have loadedTemplateId, find it in existingTemplates
    if (loadedTemplateId && loadedTemplateId !== 'system-default') {
      const template = existingTemplates.find(t => t.id === loadedTemplateId);
      if (template) return template;
    }
    
    // Third priority: try to find matching template by comparing state (for after refresh)
    if (!localState) return null;
    return findMatchingTemplate(localState, existingTemplates);
  }, [localState, existingTemplates, loadedTemplate, loadedTemplateId]);

  // Initialize local state from server state or default profile (only on first load)
  useEffect(() => {
    console.log('[GeltPage] useEffect triggered. isLoading:', isLoading, 'isLoadingDefaultTemplate:', isLoadingDefaultTemplate);
    console.log('[GeltPage] defaultTemplate:', defaultTemplate ? `Found: ${defaultTemplate.name}` : 'null/undefined');
    console.log('[GeltPage] defaultTemplate data:', defaultTemplate ? JSON.stringify(defaultTemplate.budgetConfig, null, 2) : 'null');
    
    if (isLoading || isLoadingDefaultTemplate) return;
    
    // Only initialize once - don't update localState from server after auto-save
    if (hasInitializedRef.current) return;
    
    console.log('[GeltPage] Initializing state. geltState:', JSON.stringify(geltState?.budgetConfig, null, 2));
    console.log('[GeltPage] defaultTemplate:', JSON.stringify(defaultTemplate?.budgetConfig, null, 2));

    if (geltState) {
      // Always apply default profile's isIncluded values if profile exists
      // This ensures that default profile settings are always respected
      if (defaultTemplate) {
        const defaultGroupIds = new Set(defaultTemplate.ageGroups.map(g => g.id));
        const stateGroupIds = new Set(geltState.ageGroups.map(g => g.id));
        const groupsMatch = defaultGroupIds.size === stateGroupIds.size && 
                           Array.from(defaultGroupIds).every(id => stateGroupIds.has(id));
        
        if (groupsMatch) {
          // Always merge isIncluded values from default profile
          // This ensures default profile's isIncluded settings override server state
          const mergedAgeGroups = geltState.ageGroups.map(stateGroup => {
            const defaultGroup = defaultTemplate.ageGroups.find(g => g.id === stateGroup.id);
            if (defaultGroup) {
              return {
                ...stateGroup,
                isIncluded: defaultGroup.isIncluded,
              };
            }
            return stateGroup;
          });
          
          // If state is empty, load full default profile
          if (isStateEmpty(geltState)) {
            // Prepare budgetConfig from default template - clean customBudget if not needed
            const defaultBudgetConfig: BudgetConfig = {
              participants: defaultTemplate.budgetConfig.participants,
              allowedOverflowPercentage: defaultTemplate.budgetConfig.allowedOverflowPercentage,
              ...(defaultTemplate.budgetConfig.customBudget !== undefined && 
                  defaultTemplate.budgetConfig.customBudget !== null && 
                  defaultTemplate.budgetConfig.customBudget > 0
                ? { customBudget: defaultTemplate.budgetConfig.customBudget }
                : {}),
            };
            
            setLocalState({
              ...geltState,
              ageGroups: mergedAgeGroups,
              budgetConfig: defaultBudgetConfig,
              customGroupSettings: defaultTemplate.customGroupSettings 
                ? defaultTemplate.customGroupSettings.map(group => ({ ...group }))
                : null,
            });
            skipNextAutoSaveRef.current = true;
          } else {
            // State is not empty, but still apply default profile's isIncluded values
            // Also clean budgetConfig from any invalid customBudget
            // If defaultTemplate doesn't have customBudget, we should clean it from geltState too
            const defaultHasCustomBudget = defaultTemplate.budgetConfig.customBudget !== undefined && 
                                          defaultTemplate.budgetConfig.customBudget !== null && 
                                          defaultTemplate.budgetConfig.customBudget > 0;
            
            const cleanedBudgetConfig: BudgetConfig = {
              participants: geltState.budgetConfig.participants,
              allowedOverflowPercentage: geltState.budgetConfig.allowedOverflowPercentage,
              // Only include customBudget if:
              // 1. defaultTemplate has customBudget, OR
              // 2. geltState has customBudget AND defaultTemplate doesn't exist (fallback to server state)
              // But if defaultTemplate exists and doesn't have customBudget, clean it
              ...(defaultHasCustomBudget 
                ? { customBudget: defaultTemplate.budgetConfig.customBudget }
                : (geltState.budgetConfig.customBudget !== undefined && 
                    geltState.budgetConfig.customBudget !== null && 
                    geltState.budgetConfig.customBudget > 0 &&
                    !defaultTemplate // Only use geltState's customBudget if no defaultTemplate
                  ? { customBudget: geltState.budgetConfig.customBudget }
                  : {})),
            };
            
            // Also clean customGroupSettings if defaultTemplate doesn't have it
            const cleanedCustomGroupSettings = defaultTemplate.customGroupSettings 
              ? defaultTemplate.customGroupSettings.map(group => ({ ...group }))
              : null;
            
            const newState = {
              ...geltState,
              ageGroups: mergedAgeGroups,
              budgetConfig: cleanedBudgetConfig,
              customGroupSettings: cleanedCustomGroupSettings,
            };
            
            setLocalState(newState);
            skipNextAutoSaveRef.current = true;
            lastSavedStateRef.current = JSON.stringify(newState);
            
            // If we cleaned customBudget or customGroupSettings, save immediately to DB
            const needsCleanup = (!defaultHasCustomBudget && geltState.budgetConfig.customBudget) ||
                                (!defaultTemplate.customGroupSettings && geltState.customGroupSettings);
            
            if (needsCleanup) {
              console.log('[GeltPage] Cleaning up orphaned customBudget/customGroupSettings, saving immediately');
              updateGelt.mutate(newState, {
                onSuccess: () => {
                  lastSavedStateRef.current = JSON.stringify(newState);
                },
                onError: (err) => {
                  console.error('Failed to save cleaned state:', err);
                },
              });
            }
          }
        } else {
          // Groups don't match, use state as-is but clean budgetConfig
          // If defaultTemplate doesn't have customBudget, we should clean it from geltState too
          const defaultHasCustomBudget = defaultTemplate.budgetConfig.customBudget !== undefined && 
                                        defaultTemplate.budgetConfig.customBudget !== null && 
                                        defaultTemplate.budgetConfig.customBudget > 0;
          
          const cleanedBudgetConfig: BudgetConfig = {
            participants: geltState.budgetConfig.participants,
            allowedOverflowPercentage: geltState.budgetConfig.allowedOverflowPercentage,
            // Only include customBudget if defaultTemplate has it, otherwise clean it
            ...(defaultHasCustomBudget 
              ? { customBudget: defaultTemplate.budgetConfig.customBudget }
              : {}),
          };
          
          // Also clean customGroupSettings if defaultTemplate doesn't have it
          const cleanedCustomGroupSettings = defaultTemplate.customGroupSettings 
            ? defaultTemplate.customGroupSettings.map(group => ({ ...group }))
            : null;
          
          const newState = {
            ...geltState,
            budgetConfig: cleanedBudgetConfig,
            customGroupSettings: cleanedCustomGroupSettings,
          };
          
          setLocalState(newState);
          skipNextAutoSaveRef.current = true;
          lastSavedStateRef.current = JSON.stringify(newState);
          
          // If we cleaned customBudget or customGroupSettings, save immediately to DB
          const needsCleanup = (!defaultHasCustomBudget && geltState.budgetConfig.customBudget) ||
                              (!defaultTemplate.customGroupSettings && geltState.customGroupSettings);
          
          if (needsCleanup) {
            console.log('[GeltPage] Cleaning up orphaned customBudget/customGroupSettings, saving immediately');
            updateGelt.mutate(newState, {
              onSuccess: () => {
                lastSavedStateRef.current = JSON.stringify(newState);
              },
              onError: (err) => {
                console.error('Failed to save cleaned state:', err);
              },
            });
          }
        }
      } else {
        // No default profile, use state from server but clean budgetConfig
        // Check if customGroupSettings is valid
        const hasValidCustomGroupSettings = geltState.customGroupSettings !== null && 
                                           Array.isArray(geltState.customGroupSettings) && 
                                           geltState.customGroupSettings.length > 0;
        
        // Only keep customBudget if customGroupSettings is valid
        const cleanedBudgetConfig: BudgetConfig = {
          participants: geltState.budgetConfig.participants,
          allowedOverflowPercentage: geltState.budgetConfig.allowedOverflowPercentage,
          ...(geltState.budgetConfig.customBudget !== undefined && 
              geltState.budgetConfig.customBudget !== null && 
              geltState.budgetConfig.customBudget > 0 &&
              hasValidCustomGroupSettings
            ? { customBudget: geltState.budgetConfig.customBudget }
            : {}),
        };
        
        const newState = {
          ...geltState,
          budgetConfig: cleanedBudgetConfig,
          // Also clean customGroupSettings if it's invalid
          customGroupSettings: hasValidCustomGroupSettings ? geltState.customGroupSettings : null,
        };
        
        setLocalState(newState);
        skipNextAutoSaveRef.current = true;
        lastSavedStateRef.current = JSON.stringify(newState);
        
        // If we cleaned customBudget or customGroupSettings, save immediately to DB
        const needsCleanup = (!hasValidCustomGroupSettings && geltState.budgetConfig.customBudget) ||
                            (!hasValidCustomGroupSettings && geltState.customGroupSettings);
        
        if (needsCleanup) {
          console.log('[GeltPage] Cleaning up orphaned customBudget/customGroupSettings (no default template), saving immediately');
          updateGelt.mutate(newState, {
            onSuccess: () => {
              lastSavedStateRef.current = JSON.stringify(newState);
            },
            onError: (err) => {
              console.error('Failed to save cleaned state:', err);
            },
          });
        }
      }
      hasInitializedRef.current = true;
    }
  }, [geltState, defaultTemplate, isLoading, isLoadingDefaultTemplate]);

  // Convert includedChildren array to Set for calculations
  const includedChildrenSet = useMemo(() => {
    if (!localState) return new Set<string>();
    return new Set(localState.includedChildren);
  }, [localState]);

  // Calculate budget whenever state changes
  const calculation = useMemo(() => {
    if (!localState) {
      return {
        totalRequired: 0,
        amountPerParticipant: 0,
        maxAllowed: 0,
        groupTotals: {},
      };
    }

    return calculateBudget(
      localState.ageGroups,
      localState.children,
      includedChildrenSet,
      localState.budgetConfig,
      localState.customGroupSettings
    );
  }, [localState, includedChildrenSet]);

  // Auto-save to Firestore when state changes (debounced)
  useEffect(() => {
    if (!localState || isLoading) return;

    // Skip auto-save if this is right after initialization
    if (skipNextAutoSaveRef.current) {
      console.log('[GeltPage] Skipping auto-save after initialization');
      skipNextAutoSaveRef.current = false;
      // Store the state so we can compare next time
      lastSavedStateRef.current = JSON.stringify(localState);
      return;
    }

    // Check if state actually changed (not just a new reference)
    const currentStateString = JSON.stringify(localState);
    if (lastSavedStateRef.current === currentStateString) {
      console.log('[GeltPage] State unchanged, skipping auto-save');
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log('[GeltPage] Auto-saving state. budgetConfig:', JSON.stringify(localState.budgetConfig, null, 2));
      console.log('[GeltPage] Auto-saving state. customGroupSettings:', localState.customGroupSettings ? 'exists' : 'null');
      updateGelt.mutate(localState, {
        onSuccess: () => {
          // Update last saved state after successful save
          lastSavedStateRef.current = JSON.stringify(localState);
        },
        onError: (err) => {
          showError(t('gelt.saveError'));
          console.error('Failed to save GELT state:', err);
        },
      });
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [localState, isLoading]);

  if (isLoading || isLoadingDefaultTemplate || !localState) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const handleUpdateChild = (updatedChild: Child) => {
    // Check if age was changed - if so, use updateChildAge to preserve originalAge
    const existingChild = localState.children.find(c => c.id === updatedChild.id);
    if (existingChild && existingChild.age !== updatedChild.age) {
      // Age was changed - use updateChildAge to preserve originalAge
      setLocalState({
        ...localState,
        children: updateChildAge(localState.children, updatedChild.id, updatedChild.age),
      });
    } else {
      // Other fields changed, update normally
      setLocalState({
        ...localState,
        children: localState.children.map((c) =>
          c.id === updatedChild.id ? updatedChild : c
        ),
      });
    }
  };

  const handleToggleInclude = (childId: string, include: boolean) => {
    const newIncluded = excludeChild(includedChildrenSet, childId, !include);
    setLocalState({
      ...localState,
      includedChildren: Array.from(newIncluded),
    });
  };

  const handleResetAge = (childId: string) => {
    const updated = resetChildAge(localState.children, childId);
    setLocalState({
      ...localState,
      children: updated,
    });
  };

  const handleRemoveChild = (childId: string) => {
    setLocalState({
      ...localState,
      children: localState.children.filter((c) => c.id !== childId),
      includedChildren: localState.includedChildren.filter((id) => id !== childId),
    });
  };

  const handleShowGroupChildren = (group: AgeGroup) => {
    setSelectedGroupForChildren(group);
    setShowGroupChildrenModal(true);
  };

  const handleUpdateGroup = (updatedGroup: AgeGroup) => {
    setLocalState({
      ...localState,
      ageGroups: updateAgeGroup(localState.ageGroups, updatedGroup),
    });
  };

  const handleToggleGroupInclude = (groupId: string, include: boolean) => {
    setLocalState({
      ...localState,
      ageGroups: localState.ageGroups.map((g) =>
        g.id === groupId ? { ...g, isIncluded: include } : g
      ),
    });
  };

  const handleUpdateBudgetConfig = (config: BudgetConfig) => {
    // אם מגדירים תקציב מותאם בפעם הראשונה, נשמור את הערכים המקוריים
    const wasCustomBudget = localState.budgetConfig.customBudget && localState.budgetConfig.customBudget > 0;
    const isSettingCustomBudget = config.customBudget && config.customBudget > 0;
    
    let newCustomGroupSettings = localState.customGroupSettings;
    
    // אם מגדירים תקציב מותאם בפעם הראשונה, נשמור את הערכים המקוריים
    if (!wasCustomBudget && isSettingCustomBudget) {
      newCustomGroupSettings = localState.ageGroups.map(group => ({ ...group }));
    }
    // אם מסירים תקציב מותאם, ננקה את customGroupSettings
    else if (wasCustomBudget && !isSettingCustomBudget) {
      newCustomGroupSettings = null;
    }
    
    setLocalState({
      ...localState,
      budgetConfig: updateBudgetConfig(localState.budgetConfig, config),
      customGroupSettings: newCustomGroupSettings,
    });
  };

  const handleImport = (children: Child[]) => {
    // Merge with existing children, avoiding duplicates
    const existingIds = new Set(localState.children.map((c) => c.id));
    const newChildren = children.filter((c) => !existingIds.has(c.id));
    
    setLocalState({
      ...localState,
      children: [...localState.children, ...newChildren],
      includedChildren: [
        ...localState.includedChildren,
        ...newChildren.map((c) => c.id),
      ],
    });
    
    success(t('gelt.importSuccess', { count: newChildren.length }));
  };

  const handleReset = () => {
    if (window.confirm(t('gelt.confirmReset'))) {
      resetGelt.mutate(undefined, {
        onSuccess: () => {
          // Load default profile if exists, otherwise use system defaults
          if (defaultTemplate) {
            // Prepare budgetConfig from default template - clean customBudget if not needed
            const defaultBudgetConfig: BudgetConfig = {
              participants: defaultTemplate.budgetConfig.participants,
              allowedOverflowPercentage: defaultTemplate.budgetConfig.allowedOverflowPercentage,
              ...(defaultTemplate.budgetConfig.customBudget !== undefined && 
                  defaultTemplate.budgetConfig.customBudget !== null && 
                  defaultTemplate.budgetConfig.customBudget > 0
                ? { customBudget: defaultTemplate.budgetConfig.customBudget }
                : {}),
            };
            
            // Check if customGroupSettings is valid
            const hasValidCustomGroupSettings = defaultTemplate.customGroupSettings !== null && 
                                               Array.isArray(defaultTemplate.customGroupSettings) && 
                                               defaultTemplate.customGroupSettings.length > 0;
            
            const resetState = {
              children: [],
              ageGroups: defaultTemplate.ageGroups.map(group => ({ ...group })),
              budgetConfig: defaultBudgetConfig,
              calculation: {
                totalRequired: 0,
                amountPerParticipant: 0,
                maxAllowed: 0,
                groupTotals: {},
              },
              customGroupSettings: hasValidCustomGroupSettings
                ? defaultTemplate.customGroupSettings!.map(group => ({ ...group }))
                : null,
              includedChildren: [],
            };
            
            setLocalState(resetState);
            setLoadedTemplateId(null); // Reset loaded template tracking
            skipNextAutoSaveRef.current = true;
            lastSavedStateRef.current = JSON.stringify(resetState);
            
            // Save immediately to ensure DB is clean
            updateGelt.mutate(resetState, {
              onSuccess: () => {
                lastSavedStateRef.current = JSON.stringify(resetState);
                console.log('[GeltPage] Reset with default template completed and saved successfully');
              },
              onError: (err) => {
                console.error('Failed to save reset state:', err);
              },
            });
          } else {
            // No default profile, use system defaults - identical to handleLoadSystemDefault
            const resetState = {
              children: [],
              ageGroups: DEFAULT_AGE_GROUPS.map(group => ({ ...group })),
              budgetConfig: { 
                participants: DEFAULT_BUDGET_CONFIG.participants,
                allowedOverflowPercentage: DEFAULT_BUDGET_CONFIG.allowedOverflowPercentage,
                // Explicitly no customBudget - same as handleLoadSystemDefault
              },
              calculation: {
                totalRequired: 0,
                amountPerParticipant: 0,
                maxAllowed: 0,
                groupTotals: {},
              },
              customGroupSettings: null,
              includedChildren: [],
            };
            
            setLocalState(resetState);
            setLoadedTemplateId(null); // Reset loaded template tracking
            skipNextAutoSaveRef.current = true;
            lastSavedStateRef.current = JSON.stringify(resetState);
            
            // Save immediately to ensure DB is clean
            updateGelt.mutate(resetState, {
              onSuccess: () => {
                lastSavedStateRef.current = JSON.stringify(resetState);
                console.log('[GeltPage] Reset completed and saved successfully');
              },
              onError: (err) => {
                console.error('Failed to save reset state:', err);
              },
            });
          }
          success(t('gelt.resetSuccess'));
        },
        onError: () => {
          showError(t('gelt.resetError'));
        },
      });
    }
  };

  const handleExport = () => {
    const exportData = prepareExportData(
      calculation,
      localState.budgetConfig,
      localState.ageGroups,
      localState.children
    );
    
    // יצירת headers מתורגמים עם fallback
    const getHeader = (key: string, fallback: string) => {
      const translated = t(`gelt.csvHeaders.${key}`);
      // אם התרגום מחזיר את המפתח עצמו, נשתמש ב-fallback
      return translated.startsWith('gelt.csvHeaders.') ? fallback : translated;
    };
    
    const csvHeaders = i18n.language === 'he' ? {
      budgetSummary: getHeader('budgetSummary', 'סיכום תקציב'),
      totalRequired: getHeader('totalRequired', 'סה"כ נדרש'),
      perParticipant: getHeader('perParticipant', 'למשתתף'),
      participants: getHeader('participants', 'משתתפים'),
      allowedOverflow: getHeader('allowedOverflow', 'חריגה מותרת'),
      ageGroups: getHeader('ageGroups', 'קבוצות גיל'),
      name: getHeader('name', 'שם'),
      minAge: getHeader('minAge', 'גיל מינימלי'),
      maxAge: getHeader('maxAge', 'גיל מקסימלי'),
      amountPerChild: getHeader('amountPerChild', 'סכום לילד'),
      childrenCount: getHeader('childrenCount', 'מספר ילדים'),
      total: getHeader('total', 'סה"כ'),
      children: getHeader('children', 'ילדים'),
      age: getHeader('age', 'גיל'),
      ageModified: getHeader('ageModified', 'גיל שונה'),
      originalAge: getHeader('originalAge', 'גיל מקורי')
    } : {
      budgetSummary: getHeader('budgetSummary', 'Budget Summary'),
      totalRequired: getHeader('totalRequired', 'Total Required'),
      perParticipant: getHeader('perParticipant', 'Per Participant'),
      participants: getHeader('participants', 'Participants'),
      allowedOverflow: getHeader('allowedOverflow', 'Allowed Overflow'),
      ageGroups: getHeader('ageGroups', 'Age Groups'),
      name: getHeader('name', 'Name'),
      minAge: getHeader('minAge', 'Min Age'),
      maxAge: getHeader('maxAge', 'Max Age'),
      amountPerChild: getHeader('amountPerChild', 'Amount Per Child'),
      childrenCount: getHeader('childrenCount', 'Children Count'),
      total: getHeader('total', 'Total'),
      children: getHeader('children', 'Children'),
      age: getHeader('age', 'Age'),
      ageModified: getHeader('ageModified', 'Age Modified'),
      originalAge: getHeader('originalAge', 'Original Age')
    };
    
    const csv = exportToCSV(exportData, csvHeaders);
    
    // יצירת קובץ CSV עם UTF-8 BOM לתמיכה נכונה בעברית
    // BOM bytes: 0xEF, 0xBB, 0xBF
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csv);
    const fileContent = new Uint8Array(BOM.length + csvBytes.length);
    fileContent.set(BOM, 0);
    fileContent.set(csvBytes, BOM.length);
    
    const blob = new Blob([fileContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gelt-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success(t('gelt.exportSuccess'));
  };

  const handleSaveTemplate = async (template: {
    name: string;
    description?: string;
    ageGroups: AgeGroup[];
    budgetConfig: BudgetConfig;
    customGroupSettings: AgeGroup[] | null;
    is_default?: boolean;
  }) => {
    try {
      await saveTemplate.mutateAsync(template);
      success(t('gelt.profileSaved'));
      setShowSaveTemplateModal(false);
    } catch {
      showError(t('gelt.profileSaveError'));
    }
  };

  const handleUpdateTemplate = async (template: {
    name?: string;
    description?: string;
    ageGroups?: AgeGroup[];
    budgetConfig?: BudgetConfig;
    customGroupSettings?: AgeGroup[] | null;
    is_default?: boolean;
  }) => {
    if (!loadedTemplateId) {
      showError(t('gelt.noTemplateToUpdate'));
      return;
    }
    try {
      await updateTemplate.mutateAsync({
        templateId: loadedTemplateId,
        template,
      });
      success(t('gelt.profileUpdated'));
      setShowSaveTemplateModal(false);
    } catch {
      showError(t('gelt.profileUpdateError'));
    }
  };

  const handleLoadTemplate = (template: GeltTemplate) => {
    console.log('[GeltPage] handleLoadTemplate called with template:', {
      id: template.id,
      name: template.name,
      isSystemDefault: template.id === 'system-default',
      hasId: !!template.id
    });
    
    // Prepare budgetConfig - only include customBudget if it exists in the template
    const budgetConfigToLoad: BudgetConfig = {
      participants: template.budgetConfig.participants,
      allowedOverflowPercentage: template.budgetConfig.allowedOverflowPercentage,
      ...(template.budgetConfig.customBudget !== undefined && template.budgetConfig.customBudget !== null && template.budgetConfig.customBudget > 0
        ? { customBudget: template.budgetConfig.customBudget }
        : {}),
    };

    // Check if customGroupSettings is valid
    const hasValidCustomGroupSettings = template.customGroupSettings !== null &&
                                       Array.isArray(template.customGroupSettings) &&
                                       template.customGroupSettings.length > 0;

    // Create new state explicitly - don't use spread to avoid including old customBudget
    const newState: GeltState = {
      children: localState!.children,
      ageGroups: template.ageGroups.map(group => ({ ...group })),
      budgetConfig: budgetConfigToLoad, // This explicitly excludes customBudget if not in template
      calculation: localState!.calculation,
      customGroupSettings: hasValidCustomGroupSettings
        ? template.customGroupSettings!.map(group => ({ ...group }))
        : null,
      includedChildren: localState!.includedChildren,
    };

    setLocalState(newState);
    // Track which template was loaded
    // Always save the template, even if it's system-default, so we know what was loaded
    if (template.id) {
      console.log('[GeltPage] Loading template:', template.name, 'ID:', template.id, 'isSystemDefault:', template.id === 'system-default');
      setLoadedTemplateId(template.id);
      setLoadedTemplate(template); // Save the full template
    } else {
      console.log('[GeltPage] Template has no ID, clearing loaded template');
      setLoadedTemplateId(null);
      setLoadedTemplate(null);
    }
    skipNextAutoSaveRef.current = true; // Skip auto-save since we're saving immediately
    lastSavedStateRef.current = JSON.stringify(newState); // Update last saved state
    
    // Save to server immediately to override any old state
    // This ensures that customBudget and customGroupSettings are properly cleaned in DB
    updateGelt.mutate(newState, {
      onSuccess: () => {
        // Ensure last saved state is updated after successful save
        lastSavedStateRef.current = JSON.stringify(newState);
        console.log('[GeltPage] Template loaded and saved successfully. State:', JSON.stringify(newState.budgetConfig, null, 2));
      },
      onError: (err) => {
        console.error('Failed to save state after loading profile:', err);
      },
    });
    
    success(t('gelt.profileLoaded', { name: template.name }));
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 lg:py-6">
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{t('gelt.pageTitle')}</h1>
              <button
                onClick={() => setShowHowItWorksModal(true)}
                className="p-1 sm:p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('gelt.howItWorks')}
              >
                <Info className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            {defaultTemplate && (
              <div className="flex items-center gap-1 text-xs bg-blue-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-blue-200 shadow-sm">
                <span className="font-medium text-gray-700 hidden sm:inline">{t('gelt.currentProfile')}:</span>
                <span className="text-blue-700 font-semibold text-xs truncate max-w-[150px] sm:max-w-none">
                  {defaultTemplate.is_default 
                    ? t('gelt.userDefaultProfile', { name: defaultTemplate.name })
                    : t('gelt.systemDefault')}
                </span>
              </div>
            )}
            {!defaultTemplate && (
              <div className="flex items-center gap-1 text-xs bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <span className="font-medium text-gray-700 hidden sm:inline">{t('gelt.currentProfile')}:</span>
                <span className="text-gray-600 text-xs">{t('gelt.systemDefault')}</span>
              </div>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{t('gelt.description')}</p>
          
          {/* Warning about modified ages */}
          {localState && localState.children.some(child => child.originalAge !== undefined) && (
            <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-1.5 sm:gap-2">
              <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-yellow-800 font-medium">
                  {t('gelt.modifiedAgesWarning')}
                </p>
                <p className="text-[10px] text-yellow-700 mt-0.5 sm:mt-1">
                  {t('gelt.modifiedAgesWarningDescription')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons - Mobile optimized grid */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2 mb-4 sm:mb-6">
          <Button
            variant="primary"
            onClick={() => setShowImportModal(true)}
            icon={<Upload className="w-4 h-4" />}
            size="sm"
          >
            <span className="hidden sm:inline">{t('gelt.importFromBirthdays')}</span>
            <span className="sm:hidden">{t('gelt.import')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBudgetConfigModal(true)}
            icon={<Settings className="w-4 h-4" />}
            size="sm"
          >
            <span className="hidden sm:inline">{t('gelt.budgetConfig')}</span>
            <span className="sm:hidden">{t('gelt.budget')}</span>
            <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs bg-blue-50 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
              {localState.budgetConfig.participants}/{localState.budgetConfig.allowedOverflowPercentage}%
              {localState.budgetConfig.customBudget && (
                <span className="ml-0.5 sm:ml-1 font-semibold">
                  •{localState.budgetConfig.customBudget}₪
                </span>
              )}
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowLoadTemplateModal(true)}
            icon={<FolderOpen className="w-4 h-4" />}
            size="sm"
          >
            <span className="hidden sm:inline">{t('gelt.loadProfile')}</span>
            <span className="sm:hidden">{t('gelt.load')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSaveTemplateModal(true)}
            icon={<Save className="w-4 h-4" />}
            size="sm"
          >
            {matchingTemplate && matchingTemplate.id !== 'system-default' ? (
              <>
                <span className="hidden sm:inline">{t('gelt.updateProfile')}</span>
                <span className="sm:hidden">{t('gelt.update')}</span>
                <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs bg-blue-50 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
                  {matchingTemplate.name}
                </span>
              </>
            ) : loadedTemplateId && loadedTemplateId !== 'system-default' && existingTemplates.find(t => t.id === loadedTemplateId) ? (
              <>
                <span className="hidden sm:inline">{t('gelt.updateProfile')}</span>
                <span className="sm:hidden">{t('gelt.update')}</span>
                <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs bg-blue-50 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
                  {existingTemplates.find(t => t.id === loadedTemplateId)?.name || ''}
                </span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">{t('gelt.saveProfile')}</span>
                <span className="sm:hidden">{t('gelt.save')}</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            icon={<Download className="w-4 h-4" />}
            size="sm"
          >
            <span dir="auto">{t('gelt.export')}</span>
          </Button>
          <Button
            variant="danger"
            onClick={handleReset}
            icon={<RotateCcw className="w-4 h-4" />}
            size="sm"
            className="col-span-2 sm:col-span-1"
          >
            {t('gelt.reset')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Left column - Children and Age Groups */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Children List - Collapsible */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
              <button
                onClick={() => setShowChildrenList(!showChildrenList)}
                className="w-full flex items-center justify-between gap-2 mb-3 sm:mb-4 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold">{t('gelt.children')}</h2>
                  <span className="text-xs sm:text-sm text-gray-500">
                    ({localState.children.length})
                  </span>
                </div>
                {showChildrenList ? (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                )}
              </button>
              {showChildrenList && (
                <GeltChildrenList
                  children={localState.children}
                  includedChildren={includedChildrenSet}
                  onUpdateChild={handleUpdateChild}
                  onToggleInclude={handleToggleInclude}
                  onResetAge={handleResetAge}
                />
              )}
            </div>

            {/* Age Groups List */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold">{t('gelt.ageGroups')}</h2>
              </div>
              <GeltAgeGroupsList
                ageGroups={localState.ageGroups}
                calculation={calculation}
                onUpdateGroup={handleUpdateGroup}
                onToggleInclude={handleToggleGroupInclude}
                onShowGroupChildren={handleShowGroupChildren}
                children={localState.children}
              />
            </div>
          </div>

          {/* Right column - Calculation Results */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
              <button
                onClick={() => setShowCalculationResults(!showCalculationResults)}
                className="w-full flex items-center justify-between gap-2 mb-3 sm:mb-4 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold">{t('gelt.calculationResults')}</h2>
                </div>
                {showCalculationResults ? (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                )}
              </button>
              {showCalculationResults && (
                <GeltCalculationResults calculation={calculation} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <GeltImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        birthdays={birthdays}
        ageGroups={localState.ageGroups}
      />

      {/* Budget Config Modal */}
      <GeltBudgetConfigModal
        isOpen={showBudgetConfigModal}
        onClose={() => setShowBudgetConfigModal(false)}
        config={localState.budgetConfig}
        onUpdate={handleUpdateBudgetConfig}
      />

      {/* Save Profile Modal */}
      <GeltTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => {
          console.log('[GeltPage] Closing save template modal');
          setShowSaveTemplateModal(false);
        }}
        onSave={handleSaveTemplate}
        onUpdate={(matchingTemplate && matchingTemplate.id !== 'system-default') || (loadedTemplateId && loadedTemplateId !== 'system-default') ? handleUpdateTemplate : undefined}
        templateToUpdate={(() => {
          // Prefer loadedTemplate (saved when template was loaded)
          // Fallback to matchingTemplate (found by comparing state)
          // Only return template if it's not system-default (system-default can't be updated)
          const template = loadedTemplate ?? (matchingTemplate || undefined);
          const isSystemDefault = template?.id === 'system-default';
          const finalTemplate = isSystemDefault ? undefined : template;
          console.log('[GeltPage] templateToUpdate calculation:', {
            templateName: template?.name || 'undefined',
            loadedTemplateName: loadedTemplate?.name || 'null',
            matchingTemplateName: matchingTemplate?.name || 'null',
            loadedTemplateId,
            isSystemDefault,
            finalTemplateName: finalTemplate?.name || 'undefined (filtered out system-default)',
            existingTemplatesCount: existingTemplates.length
          });
          return finalTemplate;
        })()}
        currentAgeGroups={localState.ageGroups}
        currentBudgetConfig={localState.budgetConfig}
        currentCustomGroupSettings={localState.customGroupSettings}
        existingTemplates={existingTemplates}
        isLoading={saveTemplate.isPending || updateTemplate.isPending}
      />

      {/* Load Profile Modal */}
      <GeltLoadTemplateModal
        isOpen={showLoadTemplateModal}
        onClose={() => setShowLoadTemplateModal(false)}
        onLoad={handleLoadTemplate}
        onTemplateDeleted={(wasDefault) => {
          // If default profile was deleted, reset to system defaults
          if (wasDefault) {
            setLocalState({
              children: localState?.children || [],
              ageGroups: DEFAULT_AGE_GROUPS.map(group => ({ ...group })),
              budgetConfig: { ...DEFAULT_BUDGET_CONFIG },
              calculation: {
                totalRequired: 0,
                amountPerParticipant: 0,
                maxAllowed: 0,
                groupTotals: {},
              },
              customGroupSettings: null,
              includedChildren: localState?.includedChildren || [],
            });
          }
        }}
      />

      {/* How It Works Modal */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHowItWorksModal(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">{t('gelt.howItWorksTitle')}</h2>
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <p className="text-gray-700 whitespace-pre-line leading-relaxed text-sm">
                  {t('gelt.howItWorksContent')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowHowItWorksModal(false)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Group Children Modal */}
      {selectedGroupForChildren && (
        <GeltGroupChildrenModal
          isOpen={showGroupChildrenModal}
          onClose={() => {
            setShowGroupChildrenModal(false);
            setSelectedGroupForChildren(null);
          }}
          group={selectedGroupForChildren}
          children={localState.children}
          includedChildren={includedChildrenSet}
          onUpdateChild={handleUpdateChild}
          onToggleInclude={handleToggleInclude}
          onRemoveChild={handleRemoveChild}
        />
      )}
    </Layout>
  );
};
