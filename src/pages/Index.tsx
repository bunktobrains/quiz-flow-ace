import { Zap, Users, Clock, BarChart3, QrCode, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const Index = () => {
  const features = [
    {
      icon: Clock,
      title: 'Real-Time Timers',
      description: 'Default 8-second timers with per-question customization',
    },
    {
      icon: Users,
      title: 'Guest Join',
      description: 'Students join instantly via QR code — no sign-up needed',
    },
    {
      icon: BarChart3,
      title: 'Live Leaderboard',
      description: 'Real-time scoring with negative marking support',
    },
    {
      icon: FileText,
      title: 'Smart Parser',
      description: 'Paste your quiz document and we extract questions automatically',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-foreground">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-xl sm:text-2xl font-bold">B2B QUIZES</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link to="/join">
              <Button variant="outline" size="default" className="font-bold text-sm sm:text-base px-3 sm:px-4">
                Join Quiz
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="default" className="font-bold text-sm sm:text-base px-3 sm:px-4">
                <span className="hidden sm:inline">Teacher Login</span>
                <span className="sm:hidden">Login</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-3 sm:px-4 py-2 bg-secondary text-secondary-foreground font-mono text-xs sm:text-sm font-bold uppercase mb-4 sm:mb-6 border-2 border-foreground shadow-sm">
            Live Classroom Quizzes
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold leading-tight mb-4 sm:mb-6">
            Engage Students with{' '}
            <span className="text-primary">Real-Time</span>{' '}
            Quizzes
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto">
            Create live quizzes in seconds. Students join via QR code — no accounts needed. 
            Track scores in real-time with leaderboards.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link to="/auth">
              <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 font-bold gap-2 shadow-md w-full sm:w-auto">
                Get Started Free
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
            <Link to="/join">
              <Button variant="outline" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 font-bold gap-2 w-full sm:w-auto">
                <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
                Join a Quiz
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature) => (
            <Card 
              key={feature.title} 
              className="border-4 border-foreground shadow-md hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-4 sm:p-6">
                <feature.icon className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y-4 border-foreground bg-muted py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Create Quiz', desc: 'Paste your questions or create from scratch' },
              { step: '02', title: 'Share QR Code', desc: 'Students scan to join — no sign-up required' },
              { step: '03', title: 'Go Live!', desc: 'Run your quiz with real-time scoring' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-primary text-primary-foreground flex items-center justify-center text-xl sm:text-2xl font-mono font-bold border-4 border-foreground">
                  {item.step}
                </div>
                <h3 className="font-bold text-base sm:text-lg mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6">Ready to Engage Your Class?</h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
            Start creating live quizzes in seconds. Free to use.
          </p>
          <Link to="/auth">
            <Button size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 font-bold shadow-md">
              Create Your First Quiz
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-foreground py-6 sm:py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="text-base sm:text-lg font-bold">B2B QUIZES</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            © {new Date().getFullYear()} B2B QUIZES. Built for educators.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
