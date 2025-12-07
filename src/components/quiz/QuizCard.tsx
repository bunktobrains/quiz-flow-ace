import { Quiz } from '@/types/quiz';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Edit, Users, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizCardProps {
  quiz: Quiz;
  onHost?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusColors: Record<Quiz['status'], string> = {
  draft: 'bg-warning text-warning-foreground',
  ready: 'bg-success text-success-foreground',
  live: 'bg-primary text-primary-foreground',
  ended: 'bg-muted text-muted-foreground',
};

export const QuizCard = ({ quiz, onHost, onEdit, onDelete }: QuizCardProps) => {
  return (
    <Card className="border-2 border-foreground shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold truncate">{quiz.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {quiz.description || 'No description'}
            </CardDescription>
          </div>
          <Badge className={cn('shrink-0 uppercase font-mono text-xs', statusColors[quiz.status])}>
            {quiz.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{quiz.questions.length} questions</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{quiz.settings.defaultTimerSeconds}s default</span>
          </div>
        </div>
        <div className="flex gap-2">
          {quiz.status !== 'ended' && (
            <Button 
              onClick={onHost} 
              className="flex-1 gap-2"
              disabled={quiz.status === 'draft'}
            >
              <Play className="h-4 w-4" />
              {quiz.status === 'live' ? 'Resume' : 'Host'}
            </Button>
          )}
          <Button variant="outline" onClick={onEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={onDelete} size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
