import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
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
  phoneNumber: z.string().trim().min(10, 'Please enter a valid phone number').max(15, 'Phone number too long'),
});

const JoinQuiz = () => {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState<{ code?: string; displayName?: string; phoneNumber?: string }>({});

  // Check URL params for quiz code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('t');
    if (token) {
      setCode(token);
    }
  }, []);

  const handleJoin = () => {
    const result = joinSchema.safeParse({ code, displayName, phoneNumber });
    if (!result.success) {
      const fieldErrors: { code?: string; displayName?: string; phoneNumber?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'code') fieldErrors.code = err.message;
        if (err.path[0] === 'displayName') fieldErrors.displayName = err.message;
        if (err.path[0] === 'phoneNumber') fieldErrors.phoneNumber = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    // Extract quiz ID from URL if present, otherwise use code as token
    let resolvedQuizId = quizId;
    
    if (!resolvedQuizId) {
      // Try to parse code as quizId|token format
      if (code.includes('|')) {
        const [parsedQuizId] = code.split('|');
        resolvedQuizId = parsedQuizId;
      } else {
        toast.error('Invalid quiz code format');
        return;
      }
    }

    // Navigate to quiz play page with display name and phone
    navigate(`/play/${resolvedQuizId}?name=${encodeURIComponent(displayName)}&t=${code}&phone=${encodeURIComponent(phoneNumber)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-foreground">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-xl sm:text-2xl font-bold">B2B QUIZES</span>
          </Link>
          <Link to="/">
            <Button variant="outline" className="gap-2 text-sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md border-4 border-foreground shadow-lg">
          <CardHeader className="border-b-4 border-foreground bg-secondary text-secondary-foreground text-center p-4 sm:p-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Join Quiz</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm">Quiz Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="border-2 border-foreground font-mono text-base sm:text-lg text-center tracking-widest h-12"
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm">Your Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="border-2 border-foreground h-12"
                maxLength={30}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This will be shown on the leaderboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                placeholder="Enter your phone number"
                className="border-2 border-foreground h-12"
                maxLength={15}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-destructive">{errors.phoneNumber}</p>
              )}
            </div>

            <Button
              onClick={handleJoin}
              className="w-full font-bold py-6 text-base sm:text-lg min-h-[56px]"
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
