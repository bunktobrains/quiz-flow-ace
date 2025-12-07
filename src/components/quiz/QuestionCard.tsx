import { QuizQuestion } from '@/types/quiz';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer } from '@/components/ui/timer';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedOptions: string[];
  onSelectOption: (optionId: string) => void;
  isActive: boolean;
  showTimer?: boolean;
  onTimeUp?: () => void;
  showResult?: boolean;
  isCorrect?: boolean;
}

export const QuestionCard = ({
  question,
  questionNumber,
  totalQuestions,
  selectedOptions,
  onSelectOption,
  isActive,
  showTimer = true,
  onTimeUp,
  showResult = false,
  isCorrect,
}: QuestionCardProps) => {
  return (
    <Card className="border-4 border-foreground shadow-lg w-full max-w-2xl mx-auto">
      <CardHeader className="border-b-4 border-foreground bg-muted p-3 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs sm:text-sm font-bold uppercase">
            Question {questionNumber} / {totalQuestions}
          </span>
          {showTimer && isActive && (
            <Timer 
              duration={question.timerSeconds} 
              onComplete={onTimeUp}
              showProgress={false}
            />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <span className="px-2 py-0.5 bg-success text-success-foreground font-mono text-xs">
            +{question.pointsIfCorrect}
          </span>
          {question.pointsIfWrong !== 0 && (
            <span className="px-2 py-0.5 bg-destructive text-destructive-foreground font-mono text-xs">
              {question.pointsIfWrong}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <h2 className="text-base sm:text-xl font-bold mb-4 sm:mb-6">{question.stem}</h2>
        
        {question.media.length > 0 && (
          <div className="mb-4 sm:mb-6">
            {question.media.map((m, idx) => (
              m.type === 'image' && (
                <img 
                  key={idx} 
                  src={m.url} 
                  alt={m.caption || 'Question image'} 
                  className="max-w-full border-2 border-foreground"
                />
              )
            ))}
          </div>
        )}

        <div className="grid gap-2 sm:gap-3">
          {question.options.map((option) => {
            const isSelected = selectedOptions.includes(option.oid);
            const isCorrectOption = question.correct.includes(option.oid);
            
            let buttonVariant: 'outline' | 'default' | 'destructive' = 'outline';
            let additionalClasses = '';
            
            if (showResult) {
              if (isCorrectOption) {
                additionalClasses = 'border-success bg-success/10 text-success';
              } else if (isSelected && !isCorrectOption) {
                buttonVariant = 'destructive';
              }
            } else if (isSelected) {
              buttonVariant = 'default';
            }

            return (
              <Button
                key={option.oid}
                variant={buttonVariant}
                className={cn(
                  'h-auto py-3 sm:py-4 px-3 sm:px-6 justify-start text-left border-2 font-normal min-h-[48px]',
                  additionalClasses,
                  !isActive && 'pointer-events-none opacity-70'
                )}
                onClick={() => isActive && onSelectOption(option.oid)}
                disabled={!isActive}
              >
                <span className="shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center border-2 border-current font-bold mr-2 sm:mr-4 text-xs sm:text-sm">
                  {option.oid}
                </span>
                <span className="flex-1 text-sm sm:text-base">{option.text}</span>
              </Button>
            );
          })}
        </div>

        {showResult && question.explanation && (
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 border-2 border-foreground bg-muted">
            <p className="text-xs sm:text-sm font-bold uppercase mb-1">Explanation</p>
            <p className="text-xs sm:text-sm">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
