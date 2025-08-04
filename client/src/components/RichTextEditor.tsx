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
  icon: string;
}

const DYNAMIC_FIELDS: DynamicField[] = [
  { id: "{{firstName}}", label: "First Name", placeholder: "John", icon: "User" },
  { id: "{{lastName}}", label: "Last Name", placeholder: "Doe", icon: "User" },
  { id: "{{email}}", label: "Email", placeholder: "john@example.com", icon: "Mail" },
  { id: "{{company}}", label: "Company", placeholder: "Acme Corp", icon: "Building" },
  { id: "{{website}}", label: "Website", placeholder: "acme.com", icon: "Link" },
  { id: "{{location}}", label: "Location", placeholder: "New York", icon: "MapPin" },
  { id: "{{phone}}", label: "Phone", placeholder: "+1234567890", icon: "Phone" },
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  personalizationStatus?: {
    hasAllPersonalized: boolean;
    sampleData: Array<{
      name: string;
      email: string;
      company?: string;
      hasPersonalizedEmail: boolean;
    }>;
  };
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = "200px", personalizationStatus }: RichTextEditorProps) {
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
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Dynamic Fields:</p>
          {personalizationStatus?.hasAllPersonalized && (
            <div className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Showing personalized previews
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const currentValue = textarea.value;
                  const newValue = currentValue.substring(0, start) + '{personalize_email}' + currentValue.substring(end);
                  onChange(newValue);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + 19, start + 19);
                  }, 0);
                }
              }}
              className={`px-3 py-1 text-xs border rounded hover:bg-blue-200 font-mono ${
                personalizationStatus?.hasAllPersonalized 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-blue-100 text-blue-800 border-blue-200'
              }`}
            >
              {personalizationStatus?.hasAllPersonalized 
                ? 'Personalized Email ✓'
                : `{personalize_email}`}
            </button>
            {personalizationStatus?.hasAllPersonalized && personalizationStatus.sampleData?.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap max-w-xs">
                Preview: All {personalizationStatus.sampleData.length} recipients have personalized emails ready
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentValue = textarea.value;
                const newValue = currentValue.substring(0, start) + '{name}' + currentValue.substring(end);
                onChange(newValue);
                setTimeout(() => {
                  textarea.focus();
                  textarea.setSelectionRange(start + 6, start + 6);
                }, 0);
              }
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 rounded hover:bg-blue-200 font-mono"
          >
            {`{name}`}
          </button>
          <button
            type="button"
            onClick={() => {
              const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentValue = textarea.value;
                const newValue = currentValue.substring(0, start) + '{lastName}' + currentValue.substring(end);
                onChange(newValue);
                setTimeout(() => {
                  textarea.focus();
                  textarea.setSelectionRange(start + 10, start + 10);
                }, 0);
              }
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 rounded hover:bg-blue-200 font-mono"
          >
            {`{lastName}`}
          </button>
          <button
            type="button"
            onClick={() => {
              const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentValue = textarea.value;
                const newValue = currentValue.substring(0, start) + '{position}' + currentValue.substring(end);
                onChange(newValue);
                setTimeout(() => {
                  textarea.focus();
                  textarea.setSelectionRange(start + 10, start + 10);
                }, 0);
              }
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 rounded hover:bg-blue-200 font-mono"
          >
            {`{position}`}
          </button>
          <button
            type="button"
            onClick={() => {
              const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const currentValue = textarea.value;
                const newValue = currentValue.substring(0, start) + '{company}' + currentValue.substring(end);
                onChange(newValue);
                setTimeout(() => {
                  textarea.focus();
                  textarea.setSelectionRange(start + 9, start + 9);
                }, 0);
              }
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 rounded hover:bg-blue-200 font-mono"
          >
            {`{company}`}
          </button>
        </div>
      </div>
    </div>
  );
}