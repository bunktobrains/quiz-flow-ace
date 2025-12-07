import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { QuizCard } from '@/components/quiz/QuizCard';
import { Plus, LogOut, Zap, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Quiz } from '@/types/quiz';
import { DbQuiz } from '@/types/database';
import { User } from '@supabase/supabase-js';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      } else {
        loadQuizzes(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadQuizzes = async (userId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load quizzes');
    } else if (data) {
      const typedData = data as unknown as DbQuiz[];
      const parsedQuizzes = typedData.map((q) => ({
        id: q.id,
        ...(q.quiz_data as unknown as Omit<Quiz, 'id'>),
      }));
      setQuizzes(parsedQuizzes);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleDeleteQuiz = async (quizId: string) => {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) {
      toast.error('Failed to delete quiz');
    } else {
      setQuizzes(quizzes.filter((q) => q.id !== quizId));
      toast.success('Quiz deleted');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-foreground">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-xl sm:text-2xl font-bold">B2B QUIZES</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground hidden md:block truncate max-w-[150px]">
              {user?.email}
            </span>
            <Button variant="outline" onClick={handleLogout} className="gap-1 sm:gap-2 text-sm px-2 sm:px-4">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Quizzes</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Create and manage your live quizzes
            </p>
          </div>
          <Button 
            onClick={() => navigate('/create')} 
            className="gap-2 font-bold shadow-md w-full sm:w-auto"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Create Quiz
          </Button>
        </div>

        {/* Quiz Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">Loading quizzes...</p>
            </div>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 border-4 border-dashed border-muted px-4">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
            <h2 className="text-lg sm:text-xl font-bold mb-2">No quizzes yet</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 text-center">
              Create your first quiz to get started
            </p>
            <Button onClick={() => navigate('/create')} className="gap-2 font-bold">
              <Plus className="h-5 w-5" />
              Create Your First Quiz
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onHost={() => navigate(`/host/${quiz.id}`)}
                onEdit={() => navigate(`/edit/${quiz.id}`)}
                onDelete={() => handleDeleteQuiz(quiz.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
