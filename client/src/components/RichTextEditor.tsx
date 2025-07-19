import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  List,
  ListOrdered,
  Link,
  Type,
  User,
  Building,
  Mail,
  MapPin,
  Phone
} from "lucide-react";
import { Label } from "@/components/ui/label";

interface DynamicField {
  id: string;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
}

const DYNAMIC_FIELDS: DynamicField[] = [
  { id: "{{firstName}}", label: "First Name", placeholder: "John", icon: <User className="w-4 h-4" /> },
  { id: "{{lastName}}", label: "Last Name", placeholder: "Doe", icon: <User className="w-4 h-4" /> },
  { id: "{{email}}", label: "Email", placeholder: "john@example.com", icon: <Mail className="w-4 h-4" /> },
  { id: "{{company}}", label: "Company", placeholder: "Acme Corp", icon: <Building className="w-4 h-4" /> },
  { id: "{{website}}", label: "Website", placeholder: "acme.com", icon: <Link className="w-4 h-4" /> },
  { id: "{{location}}", label: "Location", placeholder: "New York", icon: <MapPin className="w-4 h-4" /> },
  { id: "{{phone}}", label: "Phone", placeholder: "+1234567890", icon: <Phone className="w-4 h-4" /> },
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = "200px" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showDynamicFields, setShowDynamicFields] = useState(false);

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertDynamicField = (field: DynamicField) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const fieldElement = document.createElement('span');
        fieldElement.className = 'inline-flex items-center px-2 py-1 mx-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md border border-blue-200';
        fieldElement.contentEditable = 'false';
        fieldElement.innerHTML = `
          <span class="flex items-center gap-1">
            <span class="text-blue-600">●</span>
            ${field.label}
          </span>
        `;
        fieldElement.setAttribute('data-field', field.id);
        
        range.deleteContents();
        range.insertNode(fieldElement);
        
        // Move cursor after the inserted field
        range.setStartAfter(fieldElement);
        range.setEndAfter(fieldElement);
        selection.removeAllRanges();
        selection.addRange(range);
        
        onChange(editorRef.current.innerHTML);
      }
    }
    setShowDynamicFields(false);
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-2">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Text Formatting */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('bold')}
              className="h-8 w-8 p-0"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('italic')}
              className="h-8 w-8 p-0"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('underline')}
              className="h-8 w-8 p-0"
            >
              <Underline className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Alignment */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('justifyLeft')}
              className="h-8 w-8 p-0"
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('justifyCenter')}
              className="h-8 w-8 p-0"
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('justifyRight')}
              className="h-8 w-8 p-0"
            >
              <AlignRight className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Lists */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('insertUnorderedList')}
              className="h-8 w-8 p-0"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('insertOrderedList')}
              className="h-8 w-8 p-0"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Links and Headings */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={insertLink}
              className="h-8 w-8 p-0"
            >
              <Link className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('formatBlock', 'h1')}
              className="h-8 px-2"
            >
              H1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('formatBlock', 'h2')}
              className="h-8 px-2"
            >
              H2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => executeCommand('formatBlock', 'h3')}
              className="h-8 px-2"
            >
              H3
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Dynamic Fields */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDynamicFields(!showDynamicFields)}
              className="h-8 text-xs"
            >
              <User className="w-4 h-4 mr-1" />
              Insert Field
            </Button>
            
            {showDynamicFields && (
              <Card className="absolute top-10 left-0 z-50 w-64 p-2 bg-white shadow-lg border">
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Dynamic Fields
                </Label>
                <div className="grid grid-cols-2 gap-1">
                  {DYNAMIC_FIELDS.map((field) => (
                    <Button
                      key={field.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => insertDynamicField(field)}
                      className="justify-start text-xs h-8 p-2"
                    >
                      {field.icon}
                      <span className="ml-1 truncate">{field.label}</span>
                    </Button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Simple Text Area instead of contentEditable */}
      <textarea
        value={value ? value.replace(/<[^>]*>/g, '') : ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        style={{ minHeight }}
        placeholder={placeholder}
        rows={Math.max(6, Math.ceil((parseInt(minHeight) || 200) / 24))}
      />
      
      {/* Dynamic Fields */}
      <div className="mt-3 p-3 bg-gray-50 rounded-md">
        <p className="text-sm font-medium text-gray-700 mb-2">Available Dynamic Fields:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { field: '{{name}}', label: 'Name' },
            { field: '{{lastName}}', label: 'Last Name' },
            { field: '{{companyName}}', label: 'Company' },
            { field: '{{position}}', label: 'Position' },
            { field: '{{email}}', label: 'Email' }
          ].map(({ field, label }) => (
            <button
              key={field}
              type="button"
              onClick={() => {
                const currentValue = value ? value.replace(/<[^>]*>/g, '') : '';
                onChange(currentValue + field);
              }}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              {label} ({field})
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Fields Legend */}
      <div className="bg-gray-50 border-t border-gray-200 p-2">
        <Label className="text-xs text-gray-600">
          Available Fields: 
        </Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {DYNAMIC_FIELDS.slice(0, 4).map((field) => (
            <Badge key={field.id} variant="secondary" className="text-xs">
              {field.label}
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs">
            +{DYNAMIC_FIELDS.length - 4} more
          </Badge>
        </div>
      </div>
    </div>
  );
}