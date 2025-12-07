import { QuizParticipant } from '@/types/quiz';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaitingRoomProps {
  quizTitle: string;
  teacherName: string;
  participants: QuizParticipant[];
  isHost?: boolean;
  countdown?: number | null;
}

export const WaitingRoom = ({ 
  quizTitle, 
  teacherName, 
  participants,
  isHost = false,
  countdown 
}: WaitingRoomProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-background">
      <Card className="w-full max-w-lg border-4 border-foreground shadow-lg">
        <CardHeader className="border-b-4 border-foreground bg-primary text-primary-foreground text-center p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl font-bold">{quizTitle}</CardTitle>
          <p className="text-xs sm:text-sm mt-1 opacity-90">by {teacherName}</p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-2xl sm:text-3xl font-mono font-bold">{participants.length}</span>
            <span className="text-sm sm:text-base text-muted-foreground">participants</span>
          </div>

          {countdown !== null && countdown !== undefined ? (
            <div className="text-center mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">Starting in</p>
              <div className="text-5xl sm:text-6xl font-mono font-bold text-primary animate-pulse">
                {countdown}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-muted-foreground mb-4 sm:mb-6">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              <span className="text-sm sm:text-base">Waiting for host to start...</span>
            </div>
          )}

          {participants.length > 0 && (
            <div className="border-t-2 border-foreground pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Joined Players
              </p>
              <div className="flex flex-wrap gap-2 max-h-32 sm:max-h-40 overflow-y-auto">
                {participants.map((p) => (
                  <span
                    key={p.participantId}
                    className={cn(
                      'px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium border-2 border-foreground',
                      'bg-muted'
                    )}
                  >
                    {p.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
