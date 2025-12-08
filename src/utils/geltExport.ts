import { BudgetCalculation, BudgetConfig, AgeGroup, Child, ExportData } from '../types/gelt';

// הכנת נתונים לייצוא
export function prepareExportData(
  calculation: BudgetCalculation,
  budgetConfig: BudgetConfig,
  ageGroups: AgeGroup[],
  children: Child[]
): ExportData {
  return {
    budget: {
      total: calculation.totalRequired,
      perParticipant: calculation.amountPerParticipant,
      participants: budgetConfig.participants,
      allowedOverflow: budgetConfig.allowedOverflowPercentage,
    },
    ageGroups: ageGroups.map((group) => ({
      ...group,
      childCount: calculation.groupTotals[group.id]?.childrenCount || 0,
      total: calculation.groupTotals[group.id]?.total || 0,
    })),
    children: children.map((child) => ({
      name: `${child.firstName} ${child.lastName}`,
      age: child.age,
      ageModified: child.originalAge !== undefined,
      originalAge: child.originalAge,
    })),
  };
}

export interface GeltCSVHeaders {
  budgetSummary: string;
  totalRequired: string;
  perParticipant: string;
  participants: string;
  allowedOverflow: string;
  ageGroups: string;
  name: string;
  minAge: string;
  maxAge: string;
  amountPerChild: string;
  childrenCount: string;
  total: string;
  children: string;
  age: string;
  ageModified: string;
  originalAge: string;
}

// ייצוא ל-CSV
export function exportToCSV(
  exportData: ExportData,
  headers?: GeltCSVHeaders
): string {
  const lines: string[] = [];

  // Default headers (backward compatibility)
  const defaultHeaders: GeltCSVHeaders = {
    budgetSummary: 'Budget Summary',
    totalRequired: 'Total Required',
    perParticipant: 'Per Participant',
    participants: 'Participants',
    allowedOverflow: 'Allowed Overflow',
    ageGroups: 'Age Groups',
    name: 'Name',
    minAge: 'Min Age',
    maxAge: 'Max Age',
    amountPerChild: 'Amount Per Child',
    childrenCount: 'Children Count',
    total: 'Total',
    children: 'Children',
    age: 'Age',
    ageModified: 'Age Modified',
    originalAge: 'Original Age'
  };

  const csvHeaders = headers || defaultHeaders;

  // Header
  lines.push(csvHeaders.budgetSummary);
  lines.push(`${csvHeaders.totalRequired},${exportData.budget.total}`);
  lines.push(`${csvHeaders.perParticipant},${exportData.budget.perParticipant}`);
  lines.push(`${csvHeaders.participants},${exportData.budget.participants}`);
  lines.push(`${csvHeaders.allowedOverflow},${exportData.budget.allowedOverflow}%`);
  lines.push('');

  // Age Groups
  lines.push(csvHeaders.ageGroups);
  lines.push(`${csvHeaders.name},${csvHeaders.minAge},${csvHeaders.maxAge},${csvHeaders.amountPerChild},${csvHeaders.childrenCount},${csvHeaders.total}`);
  exportData.ageGroups.forEach((group) => {
    lines.push(
      `${group.name},${group.minAge},${group.maxAge},${group.amountPerChild},${group.childCount},${group.total}`
    );
  });
  lines.push('');

  // Children
  lines.push(csvHeaders.children);
  lines.push(`${csvHeaders.name},${csvHeaders.age},${csvHeaders.ageModified},${csvHeaders.originalAge}`);
  exportData.children.forEach((child) => {
    lines.push(
      `${child.name},${child.age},${child.ageModified},${child.originalAge || ''}`
    );
  });

  return lines.join('\n');
}
