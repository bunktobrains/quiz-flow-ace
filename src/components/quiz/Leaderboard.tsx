import { QuizParticipant } from '@/types/quiz';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  participants: QuizParticipant[];
  currentParticipantId?: string;
  topN?: number;
  title?: string;
}

export const Leaderboard = ({ 
  participants, 
  currentParticipantId, 
  topN = 10,
  title = 'Leaderboard'
}: LeaderboardProps) => {
  const sorted = [...participants]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    })
    .slice(0, topN);

  const currentIndex = participants.findIndex(p => p.participantId === currentParticipantId);
  const currentParticipant = currentIndex >= 0 ? participants[currentIndex] : null;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0:
        return <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />;
      case 1:
        return <Medal className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />;
      case 2:
        return <Award className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />;
      default:
        return null;
    }
  };

  return (
    <Card className="border-2 border-foreground shadow-md">
      <CardHeader className="border-b-2 border-foreground bg-primary text-primary-foreground p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
          <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-sm text-muted-foreground">
            No participants yet
          </div>
        ) : (
          <ul className="divide-y-2 divide-foreground">
            {sorted.map((participant, index) => (
              <li
                key={participant.participantId}
                className={cn(
                  'flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3',
                  participant.participantId === currentParticipantId && 'bg-primary/10'
                )}
              >
                <span className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center font-mono font-bold text-sm sm:text-lg">
                  {getRankIcon(index) || `#${index + 1}`}
                </span>
                <span className="flex-1 font-medium truncate text-sm sm:text-base">
                  {participant.displayName}
                  {participant.participantId === currentParticipantId && (
                    <span className="ml-1 sm:ml-2 text-xs text-muted-foreground">(You)</span>
                  )}
                </span>
                <span className="font-mono font-bold text-sm sm:text-lg">
                  {participant.score}
                </span>
              </li>
            ))}
          </ul>
        )}
        
        {currentParticipant && currentIndex >= topN && (
          <div className="border-t-2 border-dashed border-foreground px-3 sm:px-4 py-2 sm:py-3 bg-muted">
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center font-mono font-bold text-xs sm:text-sm">
                #{currentIndex + 1}
              </span>
              <span className="flex-1 font-medium truncate text-sm sm:text-base">
                {currentParticipant.displayName}
                <span className="ml-1 sm:ml-2 text-xs text-muted-foreground">(You)</span>
              </span>
              <span className="font-mono font-bold text-sm sm:text-lg">
                {currentParticipant.score}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
