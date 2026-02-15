import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, ListChecks, CheckSquare, Type, AlignLeft, Star, ChevronUp, ChevronDown, Copy } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { QuestionFormData, QuestionType, QuestionOption } from "./types";

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

  return (
    <Card className="p-4 border-2 border-dashed border-border hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Reorder & number */}
        <div className="flex flex-col items-center gap-1 text-muted-foreground pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="font-bold text-lg">{index + 1}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onMoveDown}
            disabled={index === totalQuestions - 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4">
          {/* Question Type Selector */}
          <div className="flex items-center gap-3">
            <Select
              value={question.question_type}
              onValueChange={(value: QuestionType) =>
                onChange({ ...question, question_type: value, options: value === 'multiple_choice' || value === 'checkbox' ? question.options : [] })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(questionTypeLabels).map(([type, labels]) => {
                  const Icon = questionTypeIcons[type as QuestionType];
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
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
              <Label htmlFor={`required-${index}`} className="text-sm text-muted-foreground">
                {language === 'th' ? 'บังคับตอบ' : 'Required'}
              </Label>
            </div>
          </div>

          {/* Question Text */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {language === 'th' ? 'คำถาม (ไทย)' : 'Question (TH)'}
              </Label>
              <Textarea
                value={question.question_text_th}
                onChange={(e) => onChange({ ...question, question_text_th: e.target.value })}
                placeholder={language === 'th' ? 'พิมพ์คำถามภาษาไทย...' : 'Type Thai question...'}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                {language === 'th' ? 'คำถาม (EN)' : 'Question (EN)'}
              </Label>
              <Textarea
                value={question.question_text_en}
                onChange={(e) => onChange({ ...question, question_text_en: e.target.value })}
                placeholder={language === 'th' ? 'Type English question...' : 'Type English question...'}
                rows={2}
              />
            </div>
          </div>

          {/* Options for Multiple Choice / Checkbox */}
          {(question.question_type === 'multiple_choice' || question.question_type === 'checkbox') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {language === 'th' ? 'ตัวเลือก' : 'Options'}
              </Label>
              
              {question.options.map((option, optIndex) => (
                <div key={option.id} className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {optIndex + 1}
                  </div>
                  <Input
                    value={option.text_th}
                    onChange={(e) => updateOption(option.id, 'text_th', e.target.value)}
                    placeholder="ตัวเลือก (ไทย)"
                    className="flex-1"
                  />
                  <Input
                    value={option.text_en}
                    onChange={(e) => updateOption(option.id, 'text_en', e.target.value)}
                    placeholder="Option (EN)"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(option.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === 'th' ? 'เพิ่มตัวเลือก' : 'Add Option'}
              </Button>
            </div>
          )}

          {/* Rating Options */}
          {question.question_type === 'rating' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{language === 'th' ? 'คะแนนต่ำสุด' : 'Min Rating'}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={question.rating_min}
                    onChange={(e) => onChange({ ...question, rating_min: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{language === 'th' ? 'คะแนนสูงสุด' : 'Max Rating'}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={question.rating_max}
                    onChange={(e) => onChange({ ...question, rating_max: parseInt(e.target.value) || 5 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{language === 'th' ? 'ป้ายกำกับต่ำสุด (TH)' : 'Min Label (TH)'}</Label>
                  <Input
                    value={question.rating_label_min_th}
                    onChange={(e) => onChange({ ...question, rating_label_min_th: e.target.value })}
                    placeholder="ไม่พอใจ"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{language === 'th' ? 'ป้ายกำกับสูงสุด (TH)' : 'Max Label (TH)'}</Label>
                  <Input
                    value={question.rating_label_max_th}
                    onChange={(e) => onChange({ ...question, rating_label_max_th: e.target.value })}
                    placeholder="พอใจมาก"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{language === 'th' ? 'ป้ายกำกับต่ำสุด (EN)' : 'Min Label (EN)'}</Label>
                  <Input
                    value={question.rating_label_min_en}
                    onChange={(e) => onChange({ ...question, rating_label_min_en: e.target.value })}
                    placeholder="Not satisfied"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{language === 'th' ? 'ป้ายกำกับสูงสุด (EN)' : 'Max Label (EN)'}</Label>
                  <Input
                    value={question.rating_label_max_en}
                    onChange={(e) => onChange({ ...question, rating_label_max_en: e.target.value })}
                    placeholder="Very satisfied"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1">
          {onDuplicate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              title={language === 'th' ? 'ทำซ้ำ' : 'Duplicate'}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title={language === 'th' ? 'ลบ' : 'Delete'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
