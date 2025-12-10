# B2B QUIZES - Live Classroom Quiz Platform

B2B QUIZES is a real-time interactive quiz platform designed for classrooms, workshops, and events. It allows hosts (teachers/presenters) to create engaging quizzes and run them live, while participants (students/attendees) join instantly via QR codes or links without needing to create an account.

## 🚀 Key Features

- **Real-time Synchronization**: Questions, timers, and game states are synced instantly across all devices using Supabase Realtime.
- **Live Leaderboard**: Dynamic scoreboard that updates after every question to keep engagement high.
- **Instant Join**: Participants can join by scanning a QR code or entering a game PIN. No login required for players.
- **Rich Media Support**: Create questions with images, audio, and video support.
- **Host Controls**: The host controls the pace of the quiz, managing when to show questions, reveal answers, and show the leaderboard.
- **Detailed Results**: Export quiz results to CSV for analysis.

## 🛠️ Tech Stack

- **Frontend**: [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Backend & Realtime**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📂 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── quiz/          # Quiz-specific components (Leaderboard, QuestionCard, etc.)
│   └── ui/            # Base UI components (Button, Card, etc.)
├── hooks/             # Custom React hooks
├── integrations/      # Third-party integrations (Supabase)
├── lib/               # Utility functions and helpers
├── pages/             # Main application pages
│   ├── Auth.tsx       # Login/Signup page
│   ├── CreateQuiz.tsx # Quiz editor
│   ├── Dashboard.tsx  # User dashboard
│   ├── HostQuiz.tsx   # Host view for running a quiz
│   ├── PlayQuiz.tsx   # Participant view for playing
│   └── ...
└── types/             # TypeScript definitions
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun
- A Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quiz-flow-ace
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   Run the SQL migrations found in `supabase/migrations` in your Supabase project's SQL editor to set up the necessary tables and policies.

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🎮 How to Play

1. **Create a Quiz**: Log in and use the "Create Quiz" button to build your question set.
2. **Host**: Click "Host" on your quiz card. You'll see a lobby with a QR code.
3. **Join**: Participants scan the QR code or go to the join URL and enter the PIN.
4. **Play**: The host starts the quiz. Questions appear on the host screen and participant devices simultaneously.
5. **Win**: Points are awarded for correct answers and speed. The winner is crowned at the end!

## 📄 License

This project is licensed under the MIT License.
