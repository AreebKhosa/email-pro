import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, User } from "lucide-react";

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
    { name: "name", label: "First Name" },
    { name: "firstName", label: "First Name" },
    { name: "lastName", label: "Last Name" },
    { name: "email", label: "Email" },
    { name: "companyName", label: "Company" },
    { name: "company", label: "Company" },
    { name: "position", label: "Position" },
    { name: "jobTitle", label: "Job Title" },
    { name: "websiteLink", label: "Website" },
    { name: "website", label: "Website" },
  ];

  const insertField = (fieldName: string) => {
    const fieldTag = `{{${fieldName}}}`;
    const newValue = value + ' ' + fieldTag + ' ';
    onChange(newValue);
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
    const escapedTag = fieldTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const newValue = value.replace(new RegExp(`\\s*${escapedTag}\\s*`, 'g'), ' ').trim();
    onChange(newValue);
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
              {standardFields.map((field) => (
                <Button
                  key={field.name}
                  variant="outline"
                  size="sm"
                  onClick={() => insertField(field.name)}
                  className="text-xs"
                >
                  {field.label}
                </Button>
              ))}
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
                  <div
                    key={field}
                    className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                  >
                    <span 
                      className="cursor-pointer hover:text-blue-600"
                      onClick={() => insertField(field)}
                    >
                      {field}
                    </span>
                    <button
                      className="ml-1 p-0 h-4 w-4 hover:bg-red-100 dark:hover:bg-red-900 rounded flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomField(field);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
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