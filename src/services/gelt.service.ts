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

      // Convert to GeltState format
      const calculation: BudgetCalculation = {
        totalRequired: 0,
        amountPerParticipant: 0,
        maxAllowed: 0,
        groupTotals: {},
      };

      // Clean budgetConfig - remove customBudget if it's not valid
      const budgetConfig = data.budgetConfig || DEFAULT_BUDGET_CONFIG;
      const cleanedBudgetConfig: BudgetConfig = {
        participants: budgetConfig.participants,
        allowedOverflowPercentage: budgetConfig.allowedOverflowPercentage,
        // Only include customBudget if it exists, is not null, and is greater than 0
        ...(budgetConfig.customBudget !== undefined && 
            budgetConfig.customBudget !== null && 
            budgetConfig.customBudget > 0
          ? { customBudget: budgetConfig.customBudget }
          : {}),
      };

      return {
        children: data.children || [],
        ageGroups: data.ageGroups || DEFAULT_AGE_GROUPS,
        budgetConfig: cleanedBudgetConfig,
        calculation,
        customGroupSettings: data.customGroupSettings || null,
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
      const docRef = doc(db, 'gelt_states', tenantId);
      const docSnap = await getDoc(docRef);

      // Prepare budgetConfig - always include customBudget (null if not set)
      // This ensures that when we reload, we know explicitly that customBudget is not set
      const hasCustomBudget = state.budgetConfig.customBudget !== undefined && 
                              state.budgetConfig.customBudget !== null && 
                              state.budgetConfig.customBudget > 0;
      
      const budgetConfigToSave: { participants: number; allowedOverflowPercentage: number; customBudget: number | null } = {
        participants: state.budgetConfig.participants,
        allowedOverflowPercentage: state.budgetConfig.allowedOverflowPercentage,
        // Always include customBudget - null if not set, value if set
        customBudget: hasCustomBudget ? (state.budgetConfig.customBudget ?? null) : null,
      };

      const stateData: Partial<GeltStateDocument> = {
        tenant_id: tenantId,
        children: state.children,
        ageGroups: state.ageGroups,
        budgetConfig: budgetConfigToSave,
        customGroupSettings: state.customGroupSettings,
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
          customGroupSettings: state.customGroupSettings,
          includedChildren: state.includedChildren,
          updated_at: serverTimestamp(),
          updated_by: userId,
        };
        
        await updateDoc(docRef, updateData);
      }
    });
  },

  async resetGeltState(tenantId: string, userId: string): Promise<void> {
    return retryFirestoreOperation(async () => {
      const docRef = doc(db, 'gelt_states', tenantId);

      const resetState: GeltStateDocument = {
        tenant_id: tenantId,
        children: [],
        ageGroups: DEFAULT_AGE_GROUPS,
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
