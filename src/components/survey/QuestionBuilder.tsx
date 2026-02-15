import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ListChecks, CheckSquare, Type, AlignLeft, Star, ChevronUp, ChevronDown, Copy, GripVertical } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { QuestionFormData, QuestionType, QuestionOption } from "./types";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface QuestionBuilderProps {
  question: QuestionFormData;
  index: number;
  totalQuestions: number;
  onChange: (question: QuestionFormData) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
}

const questionTypeIcons: Record<QuestionType, React.ElementType> = {
  multiple_choice: ListChecks,
  checkbox: CheckSquare,
  text_short: Type,
  text_long: AlignLeft,
  rating: Star,
};

const questionTypeLabels = {
  multiple_choice: { th: 'ตัวเลือกเดียว', en: 'Single Choice' },
  checkbox: { th: 'หลายตัวเลือก', en: 'Multiple Choice' },
  text_short: { th: 'ข้อความสั้น', en: 'Short Text' },
  text_long: { th: 'ข้อความยาว', en: 'Long Text' },
  rating: { th: 'ให้คะแนน', en: 'Rating Scale' },
};

export function QuestionBuilder({
  question,
  index,
  totalQuestions,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}: QuestionBuilderProps) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);

  const addOption = () => {
    const newOption: QuestionOption = {
      id: crypto.randomUUID(),
      text_th: '',
      text_en: '',
    };
    onChange({
      ...question,
      options: [...question.options, newOption],
    });
  };

  const updateOption = (optionId: string, field: 'text_th' | 'text_en', value: string) => {
    onChange({
      ...question,
      options: question.options.map((opt) =>
        opt.id === optionId ? { ...opt, [field]: value } : opt
      ),
    });
  };

  const removeOption = (optionId: string) => {
    onChange({
      ...question,
      options: question.options.filter((opt) => opt.id !== optionId),
    });
  };

  const Icon = questionTypeIcons[question.question_type];
  const typeLabel = questionTypeLabels[question.question_type];
  const questionTitle = (language === 'th' ? question.question_text_th : question.question_text_en) || 
    (language === 'th' ? 'คำถามใหม่' : 'New question');

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 border bg-card/80 backdrop-blur-sm",
      isExpanded ? "shadow-md" : "shadow-sm hover:shadow-md"
    )}>
      {/* Header bar — always visible */}
      <div 
        className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/50 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Drag handle + number */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <GripVertical className="h-4 w-4 opacity-40" />
          <span className="text-xs font-bold bg-primary/10 text-primary rounded-full h-6 w-6 flex items-center justify-center">
            {index + 1}
          </span>
        </div>

        {/* Type icon + question preview */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate text-foreground">
            {questionTitle}
          </span>
          {question.is_required && (
            <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded flex-shrink-0">
              {language === 'th' ? 'จำเป็น' : 'Required'}
            </span>
          )}
        </div>

        {/* Collapse/expand actions */}
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={index === 0}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={index === totalQuestions - 1}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          {onDuplicate && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable body */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Question Type + Required toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={question.question_type}
              onValueChange={(value: QuestionType) =>
                onChange({ ...question, question_type: value, options: value === 'multiple_choice' || value === 'checkbox' ? question.options : [] })
              }
            >
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(questionTypeLabels).map(([type, labels]) => {
                  const TypeIcon = questionTypeIcons[type as QuestionType];
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        <span>{language === 'th' ? labels.th : labels.en}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              <Switch
                id={`required-${index}`}
                checked={question.is_required}
                onCheckedChange={(checked) => onChange({ ...question, is_required: checked })}
              />
              <Label htmlFor={`required-${index}`} className="text-xs text-muted-foreground">
                {language === 'th' ? 'บังคับตอบ' : 'Required'}
              </Label>
            </div>
          </div>

          {/* Question Text — stacked on mobile, side-by-side on larger */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                🇹🇭 {language === 'th' ? 'คำถาม (ไทย)' : 'Question (Thai)'}
              </Label>
              <Input
                value={question.question_text_th}
                onChange={(e) => onChange({ ...question, question_text_th: e.target.value })}
                placeholder={language === 'th' ? 'พิมพ์คำถามภาษาไทย...' : 'Type Thai question...'}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                🇬🇧 {language === 'th' ? 'คำถาม (EN)' : 'Question (English)'}
              </Label>
              <Input
                value={question.question_text_en}
                onChange={(e) => onChange({ ...question, question_text_en: e.target.value })}
                placeholder={language === 'th' ? 'Type English question...' : 'Type English question...'}
                className="h-10"
              />
            </div>
          </div>

          {/* Options for Multiple Choice / Checkbox */}
          {(question.question_type === 'multiple_choice' || question.question_type === 'checkbox') && (
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {language === 'th' ? 'ตัวเลือก' : 'Options'}
              </Label>
              
              {question.options.map((option, optIndex) => (
                <div key={option.id} className="flex items-start gap-2 group">
                  <div className="h-9 w-7 rounded-md bg-muted/60 flex items-center justify-center text-xs font-medium text-muted-foreground mt-0.5 flex-shrink-0">
                    {question.question_type === 'multiple_choice' ? '○' : '☐'}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={option.text_th}
                      onChange={(e) => updateOption(option.id, 'text_th', e.target.value)}
                      placeholder={`${language === 'th' ? 'ตัวเลือก' : 'Option'} ${optIndex + 1} (TH)`}
                      className="h-9 text-sm"
                    />
                    <Input
                      value={option.text_en}
                      onChange={(e) => updateOption(option.id, 'text_en', e.target.value)}
                      placeholder={`${language === 'th' ? 'ตัวเลือก' : 'Option'} ${optIndex + 1} (EN)`}
                      className="h-9 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(option.id)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={addOption}
                className="w-full h-9 border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {language === 'th' ? 'เพิ่มตัวเลือก' : 'Add Option'}
              </Button>
            </div>
          )}

          {/* Rating Options */}
          {question.question_type === 'rating' && (
            <div className="space-y-3 p-3 bg-muted/20 rounded-xl">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {language === 'th' ? 'ตั้งค่าคะแนน' : 'Rating Settings'}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{language === 'th' ? 'ต่ำสุด' : 'Min'}</Label>
                  <Input
                    type="number" min={0} max={10}
                    value={question.rating_min}
                    onChange={(e) => onChange({ ...question, rating_min: parseInt(e.target.value) || 1 })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{language === 'th' ? 'สูงสุด' : 'Max'}</Label>
                  <Input
                    type="number" min={1} max={10}
                    value={question.rating_max}
                    onChange={(e) => onChange({ ...question, rating_max: parseInt(e.target.value) || 5 })}
                    className="h-9"
                  />
                </div>
              </div>
              {/* Rating preview */}
              <div className="flex justify-center gap-1.5 py-2">
                {Array.from(
                  { length: Math.min(question.rating_max - question.rating_min + 1, 10) },
                  (_, i) => question.rating_min + i
                ).map((n) => (
                  <div key={n} className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {n}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={question.rating_label_min_th}
                  onChange={(e) => onChange({ ...question, rating_label_min_th: e.target.value })}
                  placeholder="🇹🇭 ไม่พอใจ"
                  className="h-9 text-sm"
                />
                <Input
                  value={question.rating_label_max_th}
                  onChange={(e) => onChange({ ...question, rating_label_max_th: e.target.value })}
                  placeholder="🇹🇭 พอใจมาก"
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={question.rating_label_min_en}
                  onChange={(e) => onChange({ ...question, rating_label_min_en: e.target.value })}
                  placeholder="🇬🇧 Not satisfied"
                  className="h-9 text-sm"
                />
                <Input
                  value={question.rating_label_max_en}
                  onChange={(e) => onChange({ ...question, rating_label_max_en: e.target.value })}
                  placeholder="🇬🇧 Very satisfied"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
