/**
 * Department Service Types Storage
 * Manages department-to-service-type mappings with localStorage persistence
 */

export const ALL_SERVICE_TYPES = ["locksmithing", "security", "diagnostics", "workshop", "other"] as const;
export type ServiceType = (typeof ALL_SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  locksmithing: "Locksmithing",
  security: "Security",
  diagnostics: "Diagnostics",
  workshop: "Workshop",
  other: "Other",
};

const STORAGE_KEY = "departmentServiceTypes";

// Default mappings
const DEFAULT_MAPPINGS: Record<string, ServiceType[]> = {
  "1": ["locksmithing", "diagnostics"],
  "2": ["security", "diagnostics"],
  "3": ["locksmithing", "security", "diagnostics", "workshop", "other"],
  "default": ["locksmithing", "security", "diagnostics", "workshop", "other"],
};

/**
 * Get all stored department service type mappings
 */
export function getAllDepartmentServiceTypes(): Record<string, ServiceType[]> {
  if (typeof window === "undefined") return DEFAULT_MAPPINGS;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse stored department service types:", e);
  }
  
  return DEFAULT_MAPPINGS;
}

/**
 * Get available service types for a specific department
 */
export function getServiceTypesForDepartment(departmentId: string | number | null | undefined): ServiceType[] {
  if (!departmentId) return DEFAULT_MAPPINGS.default;
  
  const mappings = getAllDepartmentServiceTypes();
  const key = String(departmentId);
  return mappings[key] || DEFAULT_MAPPINGS.default;
}

/**
 * Update service types for a department
 */
export function updateDepartmentServiceTypes(departmentId: string | number, serviceTypes: ServiceType[]): void {
  if (typeof window === "undefined") return;
  
  try {
    const mappings = getAllDepartmentServiceTypes();
    mappings[String(departmentId)] = serviceTypes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch (e) {
    console.error("Failed to save department service types:", e);
  }
}

/**
 * Reset all mappings to defaults
 */
export function resetToDefaults(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to reset department service types:", e);
  }
}

/**
 * Export current mappings as JSON
 */
export function exportMappings(): string {
  return JSON.stringify(getAllDepartmentServiceTypes(), null, 2);
}

/**
 * Import mappings from JSON
 */
export function importMappings(jsonString: string): boolean {
  try {
    const mappings = JSON.parse(jsonString);
    if (typeof mappings !== "object" || mappings === null) {
      throw new Error("Invalid mappings format");
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    return true;
  } catch (e) {
    console.error("Failed to import department service types:", e);
    return false;
  }
}
