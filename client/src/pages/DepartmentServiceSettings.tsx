import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  ALL_SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  getAllDepartmentServiceTypes,
  updateDepartmentServiceTypes,
  resetToDefaults,
  exportMappings,
  importMappings,
} from "@/lib/departmentServiceTypesStorage";

export default function DepartmentServiceSettings() {
  const [, navigate] = useLocation();
  const { data: depts } = trpc.departments.list.useQuery();
  const deptsList = depts ?? [];

  // State for service type selections
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load initial selections from storage
  useEffect(() => {
    const mappings = getAllDepartmentServiceTypes();
    const newSelections: Record<string, Set<string>> = {};
    
    deptsList.forEach((dept: any) => {
      const deptId = String(dept.id);
      const types = mappings[deptId] || mappings.default;
      newSelections[deptId] = new Set(types);
    });
    
    setSelections(newSelections);
    setHasChanges(false);
  }, [deptsList]);

  // Handle checkbox change
  const handleServiceTypeToggle = (deptId: string, serviceType: string) => {
    setSelections((prev) => {
      const newSet = new Set(prev[deptId] || []);
      if (newSet.has(serviceType)) {
        newSet.delete(serviceType);
      } else {
        newSet.add(serviceType);
      }
      return { ...prev, [deptId]: newSet };
    });
    setHasChanges(true);
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each department's configuration
      Object.entries(selections).forEach(([deptId, serviceTypes]) => {
        updateDepartmentServiceTypes(deptId, Array.from(serviceTypes) as any[]);
      });
      
      toast.success("Department service types saved successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save department service types");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    if (confirm("Are you sure you want to reset all department service types to defaults?")) {
      resetToDefaults();
      toast.success("Reset to default settings");
      
      // Reload selections
      const mappings = getAllDepartmentServiceTypes();
      const newSelections: Record<string, Set<string>> = {};
      
      deptsList.forEach((dept: any) => {
        const deptId = String(dept.id);
        const types = mappings[deptId] || mappings.default;
        newSelections[deptId] = new Set(types);
      });
      
      setSelections(newSelections);
      setHasChanges(false);
    }
  };

  // Export settings
  const handleExport = () => {
    const json = exportMappings();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "department-service-types.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  // Import settings
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const json = event.target.result;
          if (importMappings(json)) {
            toast.success("Settings imported successfully");
            
            // Reload selections
            const mappings = getAllDepartmentServiceTypes();
            const newSelections: Record<string, Set<string>> = {};
            
            deptsList.forEach((dept: any) => {
              const deptId = String(dept.id);
              const types = mappings[deptId] || mappings.default;
              newSelections[deptId] = new Set(types);
            });
            
            setSelections(newSelections);
            setHasChanges(false);
          } else {
            toast.error("Invalid settings file format");
          }
        } catch (error) {
          toast.error("Failed to import settings");
          console.error(error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/settings")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Department Service Types</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure which service types are available for each department
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-blue-900">
            Select the service types that should be available when creating enquiries for each department. These settings are stored locally and can be exported/imported for backup.
          </p>
        </CardContent>
      </Card>

      {/* Department Cards */}
      <div className="space-y-4">
        {deptsList.map((dept: any) => {
          const deptId = String(dept.id);
          const deptSelections = selections[deptId] || new Set();
          
          return (
            <Card key={dept.id}>
              <CardHeader>
                <CardTitle className="text-lg">{dept.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {ALL_SERVICE_TYPES.map((serviceType) => (
                    <div key={serviceType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${deptId}-${serviceType}`}
                        checked={deptSelections.has(serviceType)}
                        onCheckedChange={() => handleServiceTypeToggle(deptId, serviceType)}
                      />
                      <Label
                        htmlFor={`${deptId}-${serviceType}`}
                        className="font-normal cursor-pointer"
                      >
                        {SERVICE_TYPE_LABELS[serviceType]}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
        >
          Export Settings
        </Button>
        <Button
          variant="outline"
          onClick={handleImport}
        >
          Import Settings
        </Button>
      </div>

      {hasChanges && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-900">
            You have unsaved changes. Click "Save Changes" to apply them.
          </p>
        </div>
      )}
    </div>
  );
}
