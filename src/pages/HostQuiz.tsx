import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCodeDisplay } from '@/components/quiz/QRCodeDisplay';
import { Leaderboard } from '@/components/quiz/Leaderboard';
import { Timer } from '@/components/ui/timer';
import { toast } from 'sonner';
import { Quiz, QuizParticipant } from '@/types/quiz';
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
      const quizData = data.quiz_data as Omit<Quiz, 'id'>;
      setQuiz({ id: data.id, ...quizData });
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
      setParticipants(
        data.map((p) => ({
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
      .update({ quiz_data: quizData })
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
    
    // Broadcast to participants
    supabase.channel(`quiz-${id}`).send({
      type: 'broadcast',
      event: 'quiz.start',
      payload: { questionIndex: 0 },
    });
  };

  const handleNextQuestion = async () => {
    if (!quiz) return;
    
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= quiz.questions.length) {
      handleEndQuiz();
      return;
    }

    setCurrentQuestionIndex(nextIndex);
    setQuestionActive(true);
    await updateQuizState({ currentQuestionIndex: nextIndex });

    supabase.channel(`quiz-${id}`).send({
      type: 'broadcast',
      event: 'question.open',
      payload: { questionIndex: nextIndex },
    });
  };

  const handleQuestionTimeUp = useCallback(() => {
    setQuestionActive(false);
    
    supabase.channel(`quiz-${id}`).send({
      type: 'broadcast',
      event: 'question.close',
      payload: { questionIndex: currentQuestionIndex },
    });
  }, [id, currentQuestionIndex]);

  const handleEndQuiz = async () => {
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quiz...</p>
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">QuizLive</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-muted border-2 border-foreground">
              <Users className="h-4 w-4" />
              <span className="font-mono font-bold">{participants.length}</span>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-4 border-foreground shadow-lg">
              <CardHeader className="border-b-4 border-foreground bg-primary text-primary-foreground">
                <CardTitle className="text-2xl">{quiz.title}</CardTitle>
                <p className="text-sm opacity-90">{quiz.description}</p>
              </CardHeader>
              <CardContent className="p-6">
                {quiz.status === 'ready' && countdown === null && (
                  <div className="text-center py-8">
                    <h2 className="text-xl font-bold mb-4">Waiting Room</h2>
                    <p className="text-muted-foreground mb-6">
                      {participants.length} participants joined
                    </p>
                    <Button
                      onClick={startCountdown}
                      size="lg"
                      className="gap-2 font-bold text-lg px-8 py-6"
                    >
                      <Play className="h-5 w-5" />
                      Start Quiz
                    </Button>
                  </div>
                )}

                {countdown !== null && (
                  <div className="text-center py-8">
                    <p className="text-lg mb-4">Starting in...</p>
                    <div className="text-8xl font-mono font-bold text-primary animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}

                {quiz.status === 'live' && currentQuestion && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold uppercase">
                        Question {currentQuestionIndex + 1} / {quiz.questions.length}
                      </span>
                      {questionActive && (
                        <Timer
                          duration={currentQuestion.timerSeconds}
                          onComplete={handleQuestionTimeUp}
                        />
                      )}
                    </div>

                    <div className="p-6 border-4 border-foreground bg-muted">
                      <h3 className="text-xl font-bold mb-4">{currentQuestion.stem}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {currentQuestion.options.map((opt) => (
                          <div
                            key={opt.oid}
                            className={`p-4 border-2 border-foreground ${
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

                    <div className="flex gap-4">
                      {!questionActive && currentQuestionIndex < quiz.questions.length - 1 && (
                        <Button
                          onClick={handleNextQuestion}
                          size="lg"
                          className="gap-2 font-bold"
                        >
                          <SkipForward className="h-5 w-5" />
                          Next Question
                        </Button>
                      )}
                      {!questionActive && currentQuestionIndex === quiz.questions.length - 1 && (
                        <Button
                          onClick={handleEndQuiz}
                          variant="destructive"
                          size="lg"
                          className="gap-2 font-bold"
                        >
                          <StopCircle className="h-5 w-5" />
                          End Quiz
                        </Button>
                      )}
                      {questionActive && (
                        <Button
                          onClick={handleQuestionTimeUp}
                          variant="outline"
                          size="lg"
                          className="gap-2"
                        >
                          <Pause className="h-5 w-5" />
                          Close Question
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {quiz.status === 'ended' && (
                  <div className="text-center py-8">
                    <h2 className="text-2xl font-bold mb-4">Quiz Ended!</h2>
                    <p className="text-muted-foreground mb-6">
                      Final results are ready
                    </p>
                    <Button onClick={exportCSV} className="gap-2 font-bold">
                      <Download className="h-5 w-5" />
                      Export Results CSV
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
