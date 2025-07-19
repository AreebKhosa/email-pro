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

  const insertHtmlTag = (openTag: string, closeTag: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = textarea.value;
      const selectedText = currentValue.substring(start, end);
      
      let newValue;
      if (closeTag) {
        newValue = currentValue.substring(0, start) + openTag + selectedText + closeTag + currentValue.substring(end);
      } else {
        newValue = currentValue.substring(0, start) + openTag + currentValue.substring(end);
      }
      
      onChange(newValue);
      setTimeout(() => {
        textarea.focus();
        if (closeTag) {
          textarea.setSelectionRange(start + openTag.length, end + openTag.length);
        } else {
          textarea.setSelectionRange(start + openTag.length, start + openTag.length);
        }
      }, 0);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Simple HTML Tag Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => insertHtmlTag('<strong>', '</strong>')}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 font-semibold"
            title="Bold"
          >
            <strong>Bold</strong>
          </button>
          <button
            type="button"
            onClick={() => insertHtmlTag('<br>')}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
            title="New Line"
          >
            New Line
          </button>
          <button
            type="button"
            onClick={() => insertHtmlTag('<h1>', '</h1>')}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 font-bold text-lg"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertHtmlTag('<h2>', '</h2>')}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 font-bold"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertHtmlTag('<h3>', '</h3>')}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 font-semibold"
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) {
                insertHtmlTag(`<a href="${url}">`, '</a>');
              }
            }}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 text-blue-600"
            title="Link"
          >
            Link
          </button>
        </div>
      </div>

      {/* Simple Text Area */}
      <div className="relative">
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-4 border-0 focus:outline-none resize-none"
          style={{ minHeight }}
          placeholder={placeholder}
          rows={Math.max(6, Math.ceil((parseInt(minHeight) || 200) / 24))}
        />
      </div>
      
      {/* Dynamic Fields */}
      <div className="bg-gray-50 border-t border-gray-200 p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Dynamic Fields:</p>
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
                const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const currentValue = textarea.value;
                  const newValue = currentValue.substring(0, start) + field + currentValue.substring(end);
                  onChange(newValue);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + field.length, start + field.length);
                  }, 0);
                } else {
                  const currentValue = value || '';
                  onChange(currentValue + field);
                }
              }}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}