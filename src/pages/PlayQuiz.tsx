import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { WaitingRoom } from '@/components/quiz/WaitingRoom';
import { Leaderboard } from '@/components/quiz/Leaderboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Quiz, QuizParticipant, QuizQuestion } from '@/types/quiz';
import { Trophy, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const PlayQuiz = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const displayName = searchParams.get('name') || 'Anonymous';
  const token = searchParams.get('t') || '';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [questionActive, setQuestionActive] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizStatus, setQuizStatus] = useState<Quiz['status']>('ready');
  const [isLoading, setIsLoading] = useState(true);

  // Load quiz and join
  useEffect(() => {
    if (!id || !displayName) {
      navigate('/join');
      return;
    }

    loadQuizAndJoin();
  }, [id, displayName]);

  // Subscribe to realtime events
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`quiz-${id}`)
      .on('broadcast', { event: 'quiz.start' }, (payload) => {
        setQuizStatus('live');
        setCurrentQuestionIndex(payload.payload.questionIndex);
        setQuestionActive(true);
        setSelectedOptions([]);
        setShowResult(false);
      })
      .on('broadcast', { event: 'question.open' }, (payload) => {
        setCurrentQuestionIndex(payload.payload.questionIndex);
        setQuestionActive(true);
        setSelectedOptions([]);
        setShowResult(false);
      })
      .on('broadcast', { event: 'question.close' }, () => {
        setQuestionActive(false);
        setShowResult(true);
      })
      .on('broadcast', { event: 'quiz.end' }, () => {
        setQuizStatus('ended');
        setQuestionActive(false);
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
          filter: `quiz_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newParticipant: QuizParticipant = {
              participantId: payload.new.id,
              displayName: payload.new.display_name,
              score: payload.new.score || 0,
              correctCount: payload.new.correct_count || 0,
              joinedAt: payload.new.joined_at,
            };
            setParticipants((prev) => [...prev, newParticipant]);
          } else if (payload.eventType === 'UPDATE') {
            setParticipants((prev) =>
              prev.map((p) =>
                p.participantId === payload.new.id
                  ? {
                      ...p,
                      score: payload.new.score || 0,
                      correctCount: payload.new.correct_count || 0,
                    }
                  : p
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadQuizAndJoin = async () => {
    if (!id) return;
    setIsLoading(true);

    // Load quiz
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (quizError || !quizData) {
      toast.error('Quiz not found');
      navigate('/join');
      return;
    }

    const quizParsed = quizData.quiz_data as Omit<Quiz, 'id'>;
    
    // Validate token
    if (quizParsed.join.token !== token && !token.includes(quizParsed.join.token)) {
      toast.error('Invalid quiz code');
      navigate('/join');
      return;
    }

    setQuiz({ id: quizData.id, ...quizParsed });
    setQuizStatus(quizParsed.status);
    setCurrentQuestionIndex(quizParsed.currentQuestionIndex ?? -1);

    // Load existing participants
    const { data: participantsData } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('quiz_id', id);

    if (participantsData) {
      setParticipants(
        participantsData.map((p) => ({
          participantId: p.id,
          displayName: p.display_name,
          score: p.score || 0,
          correctCount: p.correct_count || 0,
          joinedAt: p.joined_at,
        }))
      );
    }

    // Check if name is unique
    const existingNames = participantsData?.map((p) => p.display_name.toLowerCase()) || [];
    let finalName = displayName;
    let suffix = 1;
    
    while (existingNames.includes(finalName.toLowerCase())) {
      finalName = `${displayName}${suffix}`;
      suffix++;
    }

    if (finalName !== displayName) {
      toast.info(`Name taken, joining as ${finalName}`);
    }

    // Join as participant
    const { data: newParticipant, error: joinError } = await supabase
      .from('quiz_participants')
      .insert({
        quiz_id: id,
        display_name: finalName,
        score: 0,
        correct_count: 0,
      })
      .select()
      .single();

    if (joinError) {
      toast.error('Failed to join quiz');
      navigate('/join');
      return;
    }

    setParticipantId(newParticipant.id);
    setIsLoading(false);
  };

  const handleSelectOption = (optionId: string) => {
    if (!questionActive) return;
    
    // For single-select questions
    setSelectedOptions([optionId]);
  };

  const handleQuestionTimeUp = useCallback(async () => {
    if (!quiz || !participantId || currentQuestionIndex < 0) return;

    setQuestionActive(false);
    setShowResult(true);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isCorrect = 
      selectedOptions.length > 0 &&
      selectedOptions.every((opt) => currentQuestion.correct.includes(opt)) &&
      currentQuestion.correct.every((opt) => selectedOptions.includes(opt));

    let pointsEarned = 0;
    if (selectedOptions.length > 0) {
      pointsEarned = isCorrect ? currentQuestion.pointsIfCorrect : currentQuestion.pointsIfWrong;
    }

    const newScore = score + pointsEarned;
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;

    setScore(newScore);
    setCorrectCount(newCorrectCount);

    // Update score in database
    await supabase
      .from('quiz_participants')
      .update({
        score: newScore,
        correct_count: newCorrectCount,
      })
      .eq('id', participantId);

    // Save answer
    await supabase.from('quiz_answers').insert({
      participant_id: participantId,
      quiz_id: id,
      question_id: currentQuestion.qid,
      selected_options: selectedOptions,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    });
  }, [quiz, participantId, currentQuestionIndex, selectedOptions, score, correctCount, id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Joining quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  // Waiting Room
  if (quizStatus === 'ready') {
    return (
      <WaitingRoom
        quizTitle={quiz.title}
        teacherName={quiz.metadata.createdBy}
        participants={participants}
      />
    );
  }

  // Quiz Ended
  if (quizStatus === 'ended') {
    const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
    const myPosition = sortedParticipants.findIndex((p) => p.participantId === participantId) + 1;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-lg border-4 border-foreground shadow-lg">
          <CardHeader className="border-b-4 border-foreground bg-primary text-primary-foreground text-center">
            <Trophy className="h-12 w-12 mx-auto mb-2" />
            <CardTitle className="text-2xl font-bold">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <div className="mb-6">
              <p className="text-muted-foreground mb-2">Your final score</p>
              <p className="text-6xl font-mono font-bold text-primary">{score}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {correctCount} / {quiz.questions.length} correct
              </p>
            </div>
            
            <div className="p-4 border-4 border-foreground bg-muted mb-6">
              <p className="text-sm text-muted-foreground">Your position</p>
              <p className="text-4xl font-mono font-bold">#{myPosition}</p>
              <p className="text-sm text-muted-foreground">of {participants.length} players</p>
            </div>

            <Link to="/">
              <Button className="gap-2 font-bold">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="w-full max-w-lg mt-6">
          <Leaderboard
            participants={participants}
            currentParticipantId={participantId || undefined}
            topN={10}
            title="Final Standings"
          />
        </div>
      </div>
    );
  }

  // Live Quiz
  const currentQuestion = quiz.questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Waiting for next question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Score Header */}
        <div className="flex items-center justify-between px-4">
          <div className="text-sm text-muted-foreground">{quiz.title}</div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Score: </span>
              <span className="font-mono font-bold text-lg">{score}</span>
            </div>
          </div>
        </div>

        {/* Question */}
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={quiz.questions.length}
          selectedOptions={selectedOptions}
          onSelectOption={handleSelectOption}
          isActive={questionActive}
          showTimer={questionActive}
          onTimeUp={handleQuestionTimeUp}
          showResult={showResult}
          isCorrect={
            showResult &&
            selectedOptions.length > 0 &&
            selectedOptions.every((opt) => currentQuestion.correct.includes(opt)) &&
            currentQuestion.correct.every((opt) => selectedOptions.includes(opt))
          }
        />

        {/* Mini Leaderboard */}
        {showResult && (
          <div className="max-w-sm mx-auto">
            <Leaderboard
              participants={participants}
              currentParticipantId={participantId || undefined}
              topN={5}
              title="Top 5"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayQuiz;
