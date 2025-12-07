import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, ArrowLeft, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const joinSchema = z.object({
  code: z.string().trim().min(1, 'Please enter a quiz code'),
  displayName: z.string().trim().min(1, 'Please enter your name').max(30, 'Name must be less than 30 characters'),
});

const JoinQuiz = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<{ code?: string; displayName?: string }>({});

  // Check URL params for quiz code
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('t');
    if (token) {
      setCode(token);
    }
  });

  const handleJoin = () => {
    const result = joinSchema.safeParse({ code, displayName });
    if (!result.success) {
      const fieldErrors: { code?: string; displayName?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'code') fieldErrors.code = err.message;
        if (err.path[0] === 'displayName') fieldErrors.displayName = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    // Extract quiz ID from URL if present, otherwise use code as token
    const pathParts = window.location.pathname.split('/');
    let quizId = pathParts[2]; // /j/:quizId
    
    if (!quizId) {
      // Try to parse code as quizId|token format
      if (code.includes('|')) {
        const [parsedQuizId] = code.split('|');
        quizId = parsedQuizId;
      } else {
        toast.error('Invalid quiz code format');
        return;
      }
    }

    // Navigate to quiz play page with display name
    navigate(`/play/${quizId}?name=${encodeURIComponent(displayName)}&t=${code}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">QuizLive</span>
          </Link>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-4 border-foreground shadow-lg">
          <CardHeader className="border-b-4 border-foreground bg-secondary text-secondary-foreground text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Join Quiz</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Quiz Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="border-2 border-foreground font-mono text-lg text-center tracking-widest"
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Your Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="border-2 border-foreground"
                maxLength={30}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This will be shown on the leaderboard
              </p>
            </div>

            <Button
              onClick={handleJoin}
              className="w-full font-bold py-6 text-lg"
              size="lg"
            >
              Join Quiz
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JoinQuiz;
