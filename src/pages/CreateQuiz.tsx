import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { parseQuizDocument } from '@/lib/quizParser';
import { Quiz, QuizQuestion } from '@/types/quiz';
import { Zap, ArrowLeft, Save, AlertTriangle, Plus, Trash2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('paste');
  
  // Quiz state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  
  // Settings
  const [defaultTimer, setDefaultTimer] = useState(8);
  const [negativeMarking, setNegativeMarking] = useState(0);
  const [displayAllQuestions, setDisplayAllQuestions] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

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
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleParse = () => {
    if (!documentText.trim()) {
      toast.error('Please paste your quiz document');
      return;
    }

    const teacherName = user?.email?.split('@')[0] || 'Teacher';
    const result = parseQuizDocument(documentText, teacherName);
    
    if (result.quiz.title) setTitle(result.quiz.title);
    if (result.quiz.description) setDescription(result.quiz.description);
    if (result.quiz.questions) setQuestions(result.quiz.questions);
    if (result.quiz.settings) {
      setDefaultTimer(result.quiz.settings.defaultTimerSeconds);
      setNegativeMarking(result.quiz.settings.negativeMarkingDefault);
      setDisplayAllQuestions(result.quiz.settings.displayAllQuestionsAtOnce);
    }
    
    setParseErrors(result.errors);
    setParseWarnings(result.warnings);

    if (result.errors.length === 0 && result.quiz.questions && result.quiz.questions.length > 0) {
      toast.success(`Parsed ${result.quiz.questions.length} questions!`);
      setActiveTab('review');
    } else if (result.errors.length > 0) {
      toast.error('Some errors found. Please review and fix.');
    }
  };

  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      toast.error('Please enter a quiz title');
      return;
    }

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    // Check for missing answers
    const missingAnswers = questions.filter(q => q.correct.length === 0);
    if (missingAnswers.length > 0) {
      toast.error(`${missingAnswers.length} question(s) have no correct answer set`);
      return;
    }

    setIsLoading(true);
    
    const teacherName = user?.email?.split('@')[0] || 'Teacher';
    const quizId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20)}-${Date.now().toString(36)}`;
    const token = Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

    const quizData: Omit<Quiz, 'id'> = {
      quizId,
      title,
      description,
      settings: {
        mode: 'live',
        creatorOnlyLogin: true,
        joinRequiresLogin: false,
        guestNameUnique: true,
        defaultTimerSeconds: defaultTimer,
        displayAllQuestionsAtOnce: displayAllQuestions,
        negativeMarkingDefault: negativeMarking,
        shuffleQuestions,
        shuffleOptions,
        maxParticipants: 500,
      },
      join: {
        joinUrlPattern: `${window.location.origin}/j/{quizId}?t={token}`,
        qrPayload: `${quizId}|${token}`,
        tokenLength: 8,
        token,
      },
      questions,
      participants: [],
      leaderboard: {
        enabled: true,
        displayNamesAnonymized: false,
        topN: 10,
      },
      metadata: {
        createdBy: teacherName,
        createdAt: new Date().toISOString(),
        language: 'en',
      },
      errors: [],
      answerKeyMissing: false,
      status: 'ready',
      currentQuestionIndex: -1,
    };

    const { error } = await supabase.from('quizzes').insert({
      user_id: user?.id,
      quiz_data: quizData,
    });

    if (error) {
      toast.error('Failed to save quiz');
    } else {
      toast.success('Quiz created successfully!');
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const addEmptyQuestion = () => {
    const qid = `q${questions.length + 1}`;
    setQuestions([
      ...questions,
      {
        qid,
        rawText: '',
        stem: '',
        media: [],
        options: [
          { oid: 'A', text: '' },
          { oid: 'B', text: '' },
          { oid: 'C', text: '' },
          { oid: 'D', text: '' },
        ],
        correct: [],
        pointsIfCorrect: 1,
        pointsIfWrong: negativeMarking,
        timerSeconds: defaultTimer,
        openAt: null,
        closeAt: null,
        explanation: null,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

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
            <Link to="/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button 
              onClick={handleSaveQuiz} 
              className="gap-2 font-bold" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Quiz
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Create New Quiz</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="paste" className="font-bold">1. Paste Document</TabsTrigger>
              <TabsTrigger value="review" className="font-bold">2. Review Questions</TabsTrigger>
              <TabsTrigger value="settings" className="font-bold">3. Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="paste">
              <Card className="border-4 border-foreground">
                <CardHeader className="border-b-4 border-foreground">
                  <CardTitle>Paste Your Quiz Document</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Paste your quiz document below. Format: numbered questions with A/B/C/D options. 
                    Mark answers with [Answer: B] or ✓. Optionally add (time:10s) or (+2 / -0.5) for custom scoring.
                  </p>
                  <Textarea
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                    placeholder={`# My Quiz Title

1) What is the capital of France?
A) London
B) Paris [Answer: B]
C) Berlin
D) Madrid

2) Which planet is largest? (time:10s) (+2 / -0.25)
A) Earth
B) Mars
C) Jupiter ✓
D) Venus`}
                    className="min-h-[400px] font-mono text-sm border-2 border-foreground"
                  />
                  <Button onClick={handleParse} className="w-full font-bold py-6 text-lg">
                    Parse Document
                  </Button>

                  {parseErrors.length > 0 && (
                    <div className="p-4 border-2 border-destructive bg-destructive/10">
                      <div className="flex items-center gap-2 text-destructive font-bold mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        Errors Found
                      </div>
                      <ul className="text-sm space-y-1">
                        {parseErrors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parseWarnings.length > 0 && (
                    <div className="p-4 border-2 border-warning bg-warning/10">
                      <div className="flex items-center gap-2 text-warning-foreground font-bold mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        Warnings
                      </div>
                      <ul className="text-sm space-y-1">
                        {parseWarnings.map((warn, i) => (
                          <li key={i}>• {warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Questions ({questions.length})</h2>
                  <Button onClick={addEmptyQuestion} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                </div>

                {questions.length === 0 ? (
                  <Card className="border-4 border-dashed border-muted p-12 text-center">
                    <p className="text-muted-foreground mb-4">No questions yet</p>
                    <Button onClick={addEmptyQuestion} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add First Question
                    </Button>
                  </Card>
                ) : (
                  questions.map((q, idx) => (
                    <Card key={q.qid} className="border-4 border-foreground">
                      <CardHeader className="border-b-2 border-foreground bg-muted flex-row items-center justify-between">
                        <CardTitle className="text-lg">Question {idx + 1}</CardTitle>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeQuestion(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Question Text</Label>
                          <Textarea
                            value={q.stem}
                            onChange={(e) => updateQuestion(idx, { stem: e.target.value })}
                            className="border-2 border-foreground"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {q.options.map((opt, optIdx) => (
                            <div key={opt.oid} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-bold">{opt.oid}</Label>
                                <input
                                  type="checkbox"
                                  checked={q.correct.includes(opt.oid)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      updateQuestion(idx, { correct: [...q.correct, opt.oid] });
                                    } else {
                                      updateQuestion(idx, { correct: q.correct.filter(c => c !== opt.oid) });
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs text-muted-foreground">Correct</span>
                              </div>
                              <Input
                                value={opt.text}
                                onChange={(e) => {
                                  const newOptions = [...q.options];
                                  newOptions[optIdx] = { ...opt, text: e.target.value };
                                  updateQuestion(idx, { options: newOptions });
                                }}
                                className="border-2 border-foreground"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <Label>Timer (sec)</Label>
                            <Input
                              type="number"
                              value={q.timerSeconds}
                              onChange={(e) => updateQuestion(idx, { timerSeconds: Math.max(3, parseInt(e.target.value) || 8) })}
                              className="border-2 border-foreground"
                              min={3}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Points +</Label>
                            <Input
                              type="number"
                              step="0.25"
                              value={q.pointsIfCorrect}
                              onChange={(e) => updateQuestion(idx, { pointsIfCorrect: parseFloat(e.target.value) || 1 })}
                              className="border-2 border-foreground"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Points −</Label>
                            <Input
                              type="number"
                              step="0.25"
                              value={q.pointsIfWrong}
                              onChange={(e) => updateQuestion(idx, { pointsIfWrong: parseFloat(e.target.value) || 0 })}
                              className="border-2 border-foreground"
                            />
                          </div>
                        </div>

                        {q.correct.length === 0 && (
                          <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            No correct answer selected
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <Card className="border-4 border-foreground">
                <CardHeader className="border-b-4 border-foreground">
                  <CardTitle>Quiz Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Quiz Title</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="My Awesome Quiz"
                        className="border-2 border-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A fun quiz about..."
                        className="border-2 border-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Default Timer (seconds)</Label>
                      <Input
                        type="number"
                        value={defaultTimer}
                        onChange={(e) => setDefaultTimer(Math.max(3, parseInt(e.target.value) || 8))}
                        className="border-2 border-foreground"
                        min={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Negative Marking</Label>
                      <Input
                        type="number"
                        step="0.25"
                        value={negativeMarking}
                        onChange={(e) => setNegativeMarking(parseFloat(e.target.value) || 0)}
                        className="border-2 border-foreground"
                        placeholder="-0.25"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 border-t-2 border-foreground pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Display All Questions at Once</Label>
                        <p className="text-sm text-muted-foreground">
                          Students see all questions but each has its own timer window
                        </p>
                      </div>
                      <Switch
                        checked={displayAllQuestions}
                        onCheckedChange={setDisplayAllQuestions}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Shuffle Questions</Label>
                        <p className="text-sm text-muted-foreground">
                          Randomize question order for each participant
                        </p>
                      </div>
                      <Switch
                        checked={shuffleQuestions}
                        onCheckedChange={setShuffleQuestions}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Shuffle Options</Label>
                        <p className="text-sm text-muted-foreground">
                          Randomize A/B/C/D order for each participant
                        </p>
                      </div>
                      <Switch
                        checked={shuffleOptions}
                        onCheckedChange={setShuffleOptions}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default CreateQuiz;
