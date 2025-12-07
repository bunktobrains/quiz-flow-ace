import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { QuizCard } from '@/components/quiz/QuizCard';
import { Plus, LogOut, Zap, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Quiz } from '@/types/quiz';
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
      const parsedQuizzes = data.map((q) => ({
        id: q.id,
        ...(q.quiz_data as Omit<Quiz, 'id'>),
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">QuizLive</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Quizzes</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your live quizzes
            </p>
          </div>
          <Button 
            onClick={() => navigate('/create')} 
            className="gap-2 font-bold shadow-md"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Create Quiz
          </Button>
        </div>

        {/* Quiz Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading quizzes...</p>
            </div>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-muted">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">No quizzes yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first quiz to get started
            </p>
            <Button onClick={() => navigate('/create')} className="gap-2 font-bold">
              <Plus className="h-5 w-5" />
              Create Your First Quiz
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
