/**
 * Department-to-Service-Type Mapping
 * Maps each department to its available service types
 * Update these mappings based on your actual department setup
 */

export const DEPARTMENT_SERVICE_TYPES: Record<string, string[]> = {
  // Locksmithing Department (ID 1)
  "1": ["locksmithing", "diagnostics"],
  // Security Department (ID 2)
  "2": ["security", "diagnostics"],
  // General/Other Department (ID 3)
  "3": ["locksmithing", "security", "diagnostics", "workshop", "other"],
  // Default for unmapped departments
  "default": ["locksmithing", "security", "diagnostics", "workshop", "other"],
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  locksmithing: "Locksmithing",
  security: "Security",
  diagnostics: "Diagnostics",
  workshop: "Workshop",
  other: "Other",
};

/**
 * Get available service types for a department
 * @param departmentId - The department ID
 * @returns Array of available service types
 */
export function getServiceTypesForDepartment(departmentId: string | number | null | undefined): string[] {
  if (!departmentId) return DEPARTMENT_SERVICE_TYPES.default;
  const key = String(departmentId);
  return DEPARTMENT_SERVICE_TYPES[key] || DEPARTMENT_SERVICE_TYPES.default;
}
