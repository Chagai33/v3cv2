import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { GeltState, BudgetCalculation, BudgetConfig } from '../types/gelt';
import { DEFAULT_AGE_GROUPS, DEFAULT_BUDGET_CONFIG } from '../utils/geltConstants';
import { retryFirestoreOperation } from './firestore.retry';

// Interface for Firestore document
interface GeltStateDocument {
  tenant_id: string;
  children: Array<{
    id: string;
    firstName: string;
    lastName: string;
    age: number;
    originalAge?: number;
  }>;
  ageGroups: Array<{
    id: string;
    name: string;
    minAge: number;
    maxAge: number;
    amountPerChild: number;
    isIncluded: boolean;
  }>;
  budgetConfig: {
    participants: number;
    allowedOverflowPercentage: number;
    customBudget: number | null; // Always present - null if not set, number if set
  };
  customGroupSettings: Array<{
    id: string;
    name: string;
    minAge: number;
    maxAge: number;
    amountPerChild: number;
    isIncluded: boolean;
  }> | null;
  includedChildren: string[];
  created_at: Timestamp | FieldValue | null;
  updated_at: Timestamp | FieldValue | null;
  created_by: string;
  updated_by: string;
}

export const geltService = {
  async getGeltState(tenantId: string): Promise<GeltState | null> {
    return retryFirestoreOperation(async () => {
      const docRef = doc(db, 'gelt_states', tenantId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data() as GeltStateDocument;
      console.log('[getGeltState] Raw data from DB:', JSON.stringify(data.budgetConfig, null, 2));
      console.log('[getGeltState] customGroupSettings from DB:', data.customGroupSettings ? 'exists' : 'null');

      // Convert to GeltState format
      const calculation: BudgetCalculation = {
        totalRequired: 0,
        amountPerParticipant: 0,
        maxAllowed: 0,
        groupTotals: {},
      };

      // Clean budgetConfig - remove customBudget if it's not valid
      const budgetConfig = data.budgetConfig || { ...DEFAULT_BUDGET_CONFIG };
      
      // Check if customGroupSettings is valid (not null and not empty array)
      const hasValidCustomGroupSettings = data.customGroupSettings !== null && 
                                         Array.isArray(data.customGroupSettings) && 
                                         data.customGroupSettings.length > 0;
      
      // Only keep customBudget if:
      // 1. customBudget exists and is > 0
      // 2. AND customGroupSettings exists and is valid (not empty)
      // Otherwise, it's orphaned data that should be cleaned
      const shouldKeepCustomBudget = budgetConfig.customBudget !== undefined && 
                                     budgetConfig.customBudget !== null && 
                                     budgetConfig.customBudget > 0 &&
                                     hasValidCustomGroupSettings;
      
      console.log('[getGeltState] Should keep customBudget?', shouldKeepCustomBudget, 
                  '(customGroupSettings:', hasValidCustomGroupSettings ? 'valid' : 'null/empty', 
                  ', customBudget:', budgetConfig.customBudget, ')');
      
      const cleanedBudgetConfig: BudgetConfig = {
        participants: budgetConfig.participants,
        allowedOverflowPercentage: budgetConfig.allowedOverflowPercentage,
        // Only include customBudget if all conditions are met
        ...(shouldKeepCustomBudget
          ? { customBudget: budgetConfig.customBudget }
          : {}),
      };

      console.log('[getGeltState] Final cleanedBudgetConfig:', JSON.stringify(cleanedBudgetConfig, null, 2));
      
      // Also clean customGroupSettings if it's invalid (null or empty array)
      // If we cleaned customBudget, we should also clean customGroupSettings
      const cleanedCustomGroupSettings = shouldKeepCustomBudget && hasValidCustomGroupSettings
        ? data.customGroupSettings
        : null;

      return {
        children: data.children || [],
        ageGroups: data.ageGroups || DEFAULT_AGE_GROUPS.map(group => ({ ...group })),
        budgetConfig: cleanedBudgetConfig,
        calculation,
        customGroupSettings: cleanedCustomGroupSettings,
        includedChildren: data.includedChildren || [],
      };
    });
  },

  async saveGeltState(
    tenantId: string,
    state: GeltState,
    userId: string
  ): Promise<void> {
    return retryFirestoreOperation(async () => {
      console.log('[saveGeltState] Input state.budgetConfig:', JSON.stringify(state.budgetConfig, null, 2));
      console.log('[saveGeltState] customGroupSettings:', state.customGroupSettings ? 'exists' : 'null');
      
      const docRef = doc(db, 'gelt_states', tenantId);
      const docSnap = await getDoc(docRef);

      // Prepare budgetConfig - always include customBudget (null if not set)
      // This ensures that when we reload, we know explicitly that customBudget is not set
      const hasCustomBudget = state.budgetConfig.customBudget !== undefined && 
                              state.budgetConfig.customBudget !== null && 
                              state.budgetConfig.customBudget > 0;
      
      // Check if customGroupSettings is valid
      const hasValidCustomGroupSettings = state.customGroupSettings !== null && 
                                         Array.isArray(state.customGroupSettings) && 
                                         state.customGroupSettings.length > 0;
      
      // Only keep customBudget if customGroupSettings is valid
      const finalCustomBudget = (hasCustomBudget && hasValidCustomGroupSettings) 
        ? state.budgetConfig.customBudget 
        : null;
      
      console.log('[saveGeltState] hasCustomBudget:', hasCustomBudget);
      console.log('[saveGeltState] hasValidCustomGroupSettings:', hasValidCustomGroupSettings);
      console.log('[saveGeltState] finalCustomBudget:', finalCustomBudget);
      
      const budgetConfigToSave: { participants: number; allowedOverflowPercentage: number; customBudget: number | null } = {
        participants: state.budgetConfig.participants,
        allowedOverflowPercentage: state.budgetConfig.allowedOverflowPercentage,
        // Always include customBudget - null if not set or if customGroupSettings is invalid
        customBudget: finalCustomBudget,
      };
      console.log('[saveGeltState] budgetConfigToSave:', JSON.stringify(budgetConfigToSave, null, 2));

      // Also clean customGroupSettings if it's invalid
      const finalCustomGroupSettings = hasValidCustomGroupSettings 
        ? state.customGroupSettings 
        : null;

      const stateData: Partial<GeltStateDocument> = {
        tenant_id: tenantId,
        children: state.children,
        ageGroups: state.ageGroups,
        budgetConfig: budgetConfigToSave,
        customGroupSettings: finalCustomGroupSettings,
        includedChildren: state.includedChildren,
        updated_at: serverTimestamp(),
        updated_by: userId,
      };

      if (!docSnap.exists()) {
        // Create new document
        await setDoc(docRef, {
          ...stateData,
          created_at: serverTimestamp(),
          created_by: userId,
        } as GeltStateDocument);
      } else {
        // Update existing document - simple update with explicit null for customBudget
        const updateData: any = {
          children: state.children,
          ageGroups: state.ageGroups,
          budgetConfig: budgetConfigToSave,
          customGroupSettings: finalCustomGroupSettings, // This will be null if invalid
          includedChildren: state.includedChildren,
          updated_at: serverTimestamp(),
          updated_by: userId,
        };
        
        console.log('[saveGeltState] Updating document. customGroupSettings:', updateData.customGroupSettings ? 'exists' : 'null');
        console.log('[saveGeltState] Full updateData.customGroupSettings:', updateData.customGroupSettings);
        console.log('[saveGeltState] Full updateData.budgetConfig:', JSON.stringify(updateData.budgetConfig, null, 2));
        
        await updateDoc(docRef, updateData);
        console.log('[saveGeltState] Document updated successfully');
      }
    });
  },

  async resetGeltState(tenantId: string, userId: string): Promise<void> {
    return retryFirestoreOperation(async () => {
      const docRef = doc(db, 'gelt_states', tenantId);

      const resetState: GeltStateDocument = {
        tenant_id: tenantId,
        children: [],
        ageGroups: DEFAULT_AGE_GROUPS.map(group => ({ ...group })),
        budgetConfig: {
          participants: DEFAULT_BUDGET_CONFIG.participants,
          allowedOverflowPercentage: DEFAULT_BUDGET_CONFIG.allowedOverflowPercentage,
          customBudget: null, // Explicitly set to null
        },
        customGroupSettings: null,
        includedChildren: [],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by: userId,
        updated_by: userId,
      };

      await setDoc(docRef, resetState);
    });
  },
};
