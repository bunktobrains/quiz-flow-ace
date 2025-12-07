import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCodeDisplay } from '@/components/quiz/QRCodeDisplay';
import { Leaderboard } from '@/components/quiz/Leaderboard';
import { Timer } from '@/components/ui/timer';
import { toast } from 'sonner';
import { Quiz, QuizParticipant } from '@/types/quiz';
import { DbQuiz, DbQuizParticipant } from '@/types/database';
import { Zap, ArrowLeft, Play, Pause, SkipForward, StopCircle, Users, Download } from 'lucide-react';
import { User } from '@supabase/supabase-js';

const HostQuiz = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [questionActive, setQuestionActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`quiz-${id}`)
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
            const data = payload.new as unknown as DbQuizParticipant;
            const newParticipant: QuizParticipant = {
              participantId: data.id,
              displayName: data.display_name,
              score: data.score || 0,
              correctCount: data.correct_count || 0,
              joinedAt: data.joined_at,
            };
            setParticipants((prev) => [...prev, newParticipant]);
          } else if (payload.eventType === 'UPDATE') {
            const data = payload.new as unknown as DbQuizParticipant;
            setParticipants((prev) =>
              prev.map((p) =>
                p.participantId === data.id
                  ? {
                      ...p,
                      score: data.score || 0,
                      correctCount: data.correct_count || 0,
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      } else if (id) {
        loadQuiz();
        loadParticipants();
      }
    });

    return () => subscription.unsubscribe();
  }, [id, navigate]);

  const loadQuiz = async () => {
    if (!id) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast.error('Quiz not found');
      navigate('/dashboard');
    } else {
      const typedData = data as unknown as DbQuiz;
      const quizData = typedData.quiz_data as unknown as Omit<Quiz, 'id'>;
      setQuiz({ id: typedData.id, ...quizData });
      setCurrentQuestionIndex(quizData.currentQuestionIndex ?? -1);
    }
    setIsLoading(false);
  };

  const loadParticipants = async () => {
    if (!id) return;
    
    const { data } = await supabase
      .from('quiz_participants')
      .select('*')
      .eq('quiz_id', id);

    if (data) {
      const typedData = data as unknown as DbQuizParticipant[];
      setParticipants(
        typedData.map((p) => ({
          participantId: p.id,
          displayName: p.display_name,
          score: p.score || 0,
          correctCount: p.correct_count || 0,
          joinedAt: p.joined_at,
        }))
      );
    }
  };

  const updateQuizState = async (updates: Partial<Quiz>) => {
    if (!quiz || !id) return;
    
    const updatedQuiz = { ...quiz, ...updates };
    const { id: quizDbId, ...quizData } = updatedQuiz;
    
    await supabase
      .from('quizzes')
      .update({ quiz_data: quizData as unknown as Record<string, unknown> } as never)
      .eq('id', id);
    
    setQuiz(updatedQuiz);
  };

  const startCountdown = () => {
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          handleStartQuiz();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartQuiz = async () => {
    await updateQuizState({
      status: 'live',
      startedAt: new Date().toISOString(),
      currentQuestionIndex: 0,
    });
    setCurrentQuestionIndex(0);
    setQuestionActive(true);
    setShowCorrectAnswer(false);
    
    // Broadcast to participants
    supabase.channel(`quiz-${id}`).send({
      type: 'broadcast',
      event: 'quiz.start',
      payload: { questionIndex: 0 },
    });
  };

  const handleNextQuestion = async () => {
    if (!quiz) return;
    
    // Clear any pending auto-advance
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= quiz.questions.length) {
      handleEndQuiz();
      return;
    }

    setCurrentQuestionIndex(nextIndex);
    setQuestionActive(true);
    setShowCorrectAnswer(false);
    await updateQuizState({ currentQuestionIndex: nextIndex });

    supabase.channel(`quiz-${id}`).send({
      type: 'broadcast',
      event: 'question.open',
      payload: { questionIndex: nextIndex },
    });
  };

  const handleQuestionTimeUp = useCallback(() => {
    setQuestionActive(false);
    setShowCorrectAnswer(true);
    
    supabase.channel(`quiz-${id}`).send({
      type: 'broadcast',
      event: 'question.close',
      payload: { questionIndex: currentQuestionIndex },
    });

    // Auto-advance to next question after 2 seconds
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        handleNextQuestion();
      }, 2000);
    }
  }, [id, currentQuestionIndex, quiz]);

  const handleEndQuiz = async () => {
    // Clear any pending auto-advance
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    await updateQuizState({
      status: 'ended',
      endedAt: new Date().toISOString(),
    });
    
    supabase.channel(`quiz-${id}`).send({
      type: 'broadcast',
      event: 'quiz.end',
      payload: {},
    });

    toast.success('Quiz ended!');
  };

  const exportCSV = () => {
    if (!quiz) return;

    const headers = ['Position', 'Display Name', 'Score', 'Correct Answers'];
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    const rows = sorted.map((p, idx) => [
      idx + 1,
      p.displayName,
      p.score,
      p.correctCount,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title}-results.csv`;
    a.click();
  };

  if (isLoading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm sm:text-base text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const joinUrl = `${window.location.origin}/j/${id}?t=${quiz.join.token}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-foreground sticky top-0 bg-background z-50">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-lg sm:text-2xl font-bold hidden sm:inline">B2B QUIZES</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-muted border-2 border-foreground">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="font-mono font-bold text-sm sm:text-base">{participants.length}</span>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="border-4 border-foreground shadow-lg">
              <CardHeader className="border-b-4 border-foreground bg-primary text-primary-foreground p-3 sm:p-6">
                <CardTitle className="text-lg sm:text-2xl">{quiz.title}</CardTitle>
                <p className="text-xs sm:text-sm opacity-90">{quiz.description}</p>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {quiz.status === 'ready' && countdown === null && (
                  <div className="text-center py-6 sm:py-8">
                    <h2 className="text-lg sm:text-xl font-bold mb-4">Waiting Room</h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6">
                      {participants.length} participants joined
                    </p>
                    <Button
                      onClick={startCountdown}
                      size="lg"
                      className="gap-2 font-bold text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6"
                    >
                      <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                      Start Quiz
                    </Button>
                  </div>
                )}

                {countdown !== null && (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-base sm:text-lg mb-4">Starting in...</p>
                    <div className="text-6xl sm:text-8xl font-mono font-bold text-primary animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}

                {quiz.status === 'live' && currentQuestion && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs sm:text-sm font-bold uppercase">
                        Question {currentQuestionIndex + 1} / {quiz.questions.length}
                      </span>
                      {questionActive && (
                        <Timer
                          duration={currentQuestion.timerSeconds}
                          onComplete={handleQuestionTimeUp}
                        />
                      )}
                      {showCorrectAnswer && (
                        <span className="text-xs sm:text-sm text-success font-bold">
                          Next in 2s...
                        </span>
                      )}
                    </div>

                    <div className="p-3 sm:p-6 border-4 border-foreground bg-muted">
                      <h3 className="text-base sm:text-xl font-bold mb-4">{currentQuestion.stem}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {currentQuestion.options.map((opt) => (
                          <div
                            key={opt.oid}
                            className={`p-3 sm:p-4 border-2 border-foreground text-sm sm:text-base ${
                              currentQuestion.correct.includes(opt.oid)
                                ? 'bg-success/20 border-success'
                                : 'bg-background'
                            }`}
                          >
                            <span className="font-bold mr-2">{opt.oid}.</span>
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-4">
                      {!questionActive && currentQuestionIndex < quiz.questions.length - 1 && (
                        <Button
                          onClick={handleNextQuestion}
                          size="lg"
                          className="gap-2 font-bold text-sm sm:text-base"
                        >
                          <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
                          Next Question
                        </Button>
                      )}
                      {!questionActive && currentQuestionIndex === quiz.questions.length - 1 && (
                        <Button
                          onClick={handleEndQuiz}
                          variant="destructive"
                          size="lg"
                          className="gap-2 font-bold text-sm sm:text-base"
                        >
                          <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                          End Quiz
                        </Button>
                      )}
                      {questionActive && (
                        <Button
                          onClick={handleQuestionTimeUp}
                          variant="outline"
                          size="lg"
                          className="gap-2 text-sm sm:text-base"
                        >
                          <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                          Close Question
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {quiz.status === 'ended' && (
                  <div className="text-center py-6 sm:py-8">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4">Quiz Ended!</h2>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6">
                      Final results are ready
                    </p>
                    <Button onClick={exportCSV} className="gap-2 font-bold text-sm sm:text-base">
                      <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                      Export Results CSV
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {quiz.status === 'ready' && (
              <QRCodeDisplay
                joinUrl={joinUrl}
                quizTitle={quiz.title}
                token={quiz.join.token}
              />
            )}

            <Leaderboard
              participants={participants}
              topN={10}
              title="Live Leaderboard"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default HostQuiz;
