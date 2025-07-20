import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, User, Building, Mail, Globe, Briefcase } from "lucide-react";

interface PersonalizationFieldManagerProps {
  value: string;
  onChange: (value: string) => void;
  onFieldAdd?: (field: string) => void;
  dynamicFields?: string[];
  onDynamicFieldsChange?: (fields: string[]) => void;
}

export function PersonalizationFieldManager({ 
  value, 
  onChange, 
  onFieldAdd,
  dynamicFields = [],
  onDynamicFieldsChange 
}: PersonalizationFieldManagerProps) {
  const [newField, setNewField] = useState("");

  // Standard personalization fields
  const standardFields = [
    { name: "name", label: "First Name", icon: User },
    { name: "firstName", label: "First Name", icon: User },
    { name: "lastName", label: "Last Name", icon: User },
    { name: "email", label: "Email", icon: Mail },
    { name: "companyName", label: "Company", icon: Building },
    { name: "company", label: "Company", icon: Building },
    { name: "position", label: "Position", icon: Briefcase },
    { name: "jobTitle", label: "Job Title", icon: Briefcase },
    { name: "websiteLink", label: "Website", icon: Globe },
    { name: "website", label: "Website", icon: Globe },
  ];

  const insertField = (fieldName: string) => {
    const fieldTag = `{{${fieldName}}}`;
    onChange(value + fieldTag);
    onFieldAdd?.(fieldName);
  };

  const addCustomField = () => {
    if (newField.trim() && !dynamicFields.includes(newField.trim())) {
      const updatedFields = [...dynamicFields, newField.trim()];
      onDynamicFieldsChange?.(updatedFields);
      insertField(newField.trim());
      setNewField("");
    }
  };

  const removeCustomField = (field: string) => {
    const updatedFields = dynamicFields.filter(f => f !== field);
    onDynamicFieldsChange?.(updatedFields);
    
    // Remove field from email content
    const fieldTag = `{{${field}}}`;
    onChange(value.replace(new RegExp(fieldTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ''));
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <User className="w-4 h-4" />
          Personalization Fields
        </h4>
        
        {/* Standard Fields */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Standard Fields</p>
            <div className="flex flex-wrap gap-2">
              {standardFields.map((field) => {
                const Icon = field.icon;
                return (
                  <Button
                    key={field.name}
                    variant="outline"
                    size="sm"
                    onClick={() => insertField(field.name)}
                    className="text-xs flex items-center gap-1"
                  >
                    <Icon className="w-3 h-3" />
                    {field.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Fields</p>
            
            {/* Add new custom field */}
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Enter custom field name"
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomField();
                  }
                }}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={addCustomField}
                disabled={!newField.trim()}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>

            {/* Existing custom fields */}
            {dynamicFields.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dynamicFields.map((field) => (
                  <Badge
                    key={field}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                    onClick={() => insertField(field)}
                  >
                    {field}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomField(field);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        <p>• Click field buttons to insert them into your email</p>
        <p>• Fields will be replaced with actual recipient data when emails are sent</p>
        <p>• If a recipient doesn't have data for a field, it will be left empty</p>
      </div>
    </div>
  );
}