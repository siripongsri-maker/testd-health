import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUESTIONS } from './types';

interface Props {
  onComplete: (answers: Record<number, string>) => void;
  onBack: () => void;
}

export function PreventionMatchQuiz({ onComplete, onBack }: Props) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const question = QUESTIONS[currentQ];
  const progress = ((currentQ + 1) / QUESTIONS.length) * 100;

  const selectAnswer = (value: string) => {
    const updated = { ...answers, [question.id]: value };
    setAnswers(updated);

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        onComplete(updated);
      }
    }, 300);
  };

  const goBack = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
    else onBack();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fade-in space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={goBack} className="p-1 rounded-lg hover:bg-muted/50 transition-colors">
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-xs text-muted-foreground font-medium">
              {currentQ + 1} / {QUESTIONS.length}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="glass rounded-3xl p-6 space-y-5" key={question.id}>
          <h2 className="text-lg font-semibold text-foreground leading-snug animate-fade-in">
            {question.question}
          </h2>

          <div className="space-y-2.5">
            {question.options.map((opt) => {
              const selected = answers[question.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => selectAnswer(opt.value)}
                  className={`
                    w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200
                    ${selected
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                      : 'border-border bg-background/50 text-foreground hover:border-primary/40 hover:bg-muted/30'
                    }
                  `}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
