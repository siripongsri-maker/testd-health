import { useRef, useCallback } from "react";
import { Bold, Italic, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  language?: 'en' | 'th';
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 10,
  className,
  language = 'th',
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = useCallback((prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText: string;
    let newCursorPos: number;

    if (selectedText) {
      // Wrap selected text
      newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      newCursorPos = end + prefix.length + suffix.length;
    } else {
      // Insert placeholder
      const placeholder = language === 'th' ? 'ข้อความ' : 'text';
      newText = value.substring(0, start) + prefix + placeholder + suffix + value.substring(end);
      newCursorPos = start + prefix.length + placeholder.length;
    }

    onChange(newText);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      } else {
        // Select the placeholder text
        textarea.setSelectionRange(start + prefix.length, newCursorPos);
      }
    }, 0);
  }, [value, onChange, language]);

  const insertBulletPoint = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let newText: string;
    let newCursorPos: number;

    if (selectedText) {
      // Convert selected lines to bullet points
      const lines = selectedText.split('\n');
      const bulletLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('• ') && !trimmed.startsWith('- ')) {
          return '• ' + trimmed;
        }
        return line;
      }).join('\n');
      
      newText = value.substring(0, start) + bulletLines + value.substring(end);
      newCursorPos = start + bulletLines.length;
    } else {
      // Find the start of the current line
      let lineStart = start;
      while (lineStart > 0 && value[lineStart - 1] !== '\n') {
        lineStart--;
      }

      // Check if we're on an empty line or need to insert a new line
      const currentLineEnd = value.indexOf('\n', start);
      const currentLine = value.substring(lineStart, currentLineEnd === -1 ? value.length : currentLineEnd);
      
      if (currentLine.trim() === '') {
        // Empty line - just add bullet
        newText = value.substring(0, lineStart) + '• ' + value.substring(lineStart);
        newCursorPos = lineStart + 2;
      } else if (start === value.length || value[start] === '\n') {
        // At end of line or document - add new bullet line
        newText = value.substring(0, start) + '\n• ' + value.substring(start);
        newCursorPos = start + 3;
      } else {
        // Middle of text - add bullet at start of current line
        newText = value.substring(0, lineStart) + '• ' + value.substring(lineStart);
        newCursorPos = start + 2;
      }
    }

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  const handleBold = () => insertFormatting('**');
  const handleItalic = () => insertFormatting('*');
  const handleBullet = () => insertBulletPoint();

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          className="h-8 w-8 p-0"
          title={language === 'th' ? 'ตัวหนา' : 'Bold'}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleItalic}
          className="h-8 w-8 p-0"
          title={language === 'th' ? 'ตัวเอียง' : 'Italic'}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBullet}
          className="h-8 w-8 p-0"
          title={language === 'th' ? 'รายการ' : 'Bullet List'}
        >
          <List className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground ml-auto pr-2">
          {language === 'th' ? 'Markdown' : 'Markdown'}
        </span>
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn("min-h-[200px] font-mono text-sm", className)}
      />

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        {language === 'th' 
          ? '💡 ใช้ **ข้อความ** สำหรับตัวหนา, *ข้อความ* สำหรับตัวเอียง, • สำหรับรายการ'
          : '💡 Use **text** for bold, *text* for italic, • for bullet points'}
      </p>
    </div>
  );
}
