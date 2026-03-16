import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-quiz-player',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="min-h-screen bg-black text-white relative overflow-hidden" dir="rtl">
      
      <!-- Intro Video -->
      @if (showIntro) {
        <div class="absolute inset-0 z-50 flex items-center justify-center bg-black">
          <video #introVideo src="intro_curtain_reveal.mp4" class="w-full h-full object-cover" (ended)="onIntroEnded()"></video>
          <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/50 text-sm">
            לחץ על רווח כדי להתחיל/להשהות
          </div>
        </div>
      }

      <!-- Main Game Area -->
      @if (!showIntro && currentQuestion) {
        <div class="absolute inset-0 bg-gradient-to-b from-purple-900 via-pink-900 to-black opacity-80 z-0"></div>
        
        <div class="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
          
          <!-- Question Header -->
          <div class="text-center mb-8 max-w-4xl w-full">
            <h1 class="text-5xl md:text-7xl font-extrabold text-white drop-shadow-2xl mb-6 leading-tight">
              {{ currentQuestion.content }}
            </h1>
            
            @if (currentQuestion.type === 'image' && currentQuestion.mediaUrl) {
              <img [src]="currentQuestion.mediaUrl" class="max-h-64 mx-auto rounded-2xl shadow-2xl border-4 border-white/20 mb-6" referrerpolicy="no-referrer">
            }
            @if (currentQuestion.type === 'video' && currentQuestion.mediaUrl) {
              <video [src]="currentQuestion.mediaUrl" controls class="max-h-64 mx-auto rounded-2xl shadow-2xl border-4 border-white/20 mb-6"></video>
            }
            @if (currentQuestion.type === 'audio' && currentQuestion.mediaUrl) {
              <audio [src]="currentQuestion.mediaUrl" controls class="mx-auto mb-6"></audio>
            }
          </div>

          <!-- Answers Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            @for (answer of currentQuestion.answers; track $index; let i = $index) {
              <div class="relative bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-3xl p-6 flex items-center gap-6 transition-all duration-300 transform"
                   [class.bg-green-500]="showAnswer && answer.isCorrect"
                   [class.border-green-400]="showAnswer && answer.isCorrect"
                   [class.scale-105]="showAnswer && answer.isCorrect"
                   [class.opacity-50]="showAnswer && !answer.isCorrect && currentQuestion.type !== 'poll'">
                
                <div class="w-16 h-16 rounded-full bg-pink-500 flex items-center justify-center text-3xl font-bold shadow-lg flex-shrink-0">
                  {{ i + 1 }}
                </div>
                
                <div class="flex-1 text-2xl md:text-3xl font-bold">
                  {{ answer.text }}
                </div>

                @if (showAnswer && currentQuestion.type === 'poll') {
                  <div class="absolute left-6 text-2xl font-bold text-pink-300">
                    {{ getPollPercentage(i) }}%
                  </div>
                }
              </div>
            }
          </div>

          <!-- Timer -->
          @if (!showAnswer) {
            <div class="fixed top-8 left-8 w-32 h-32 rounded-full border-8 flex items-center justify-center text-5xl font-bold shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-colors duration-1000"
                 [class.border-green-500]="timeLeft > 10"
                 [class.text-green-500]="timeLeft > 10"
                 [class.border-yellow-500]="timeLeft <= 10 && timeLeft > 5"
                 [class.text-yellow-500]="timeLeft <= 10 && timeLeft > 5"
                 [class.border-red-500]="timeLeft <= 5"
                 [class.text-red-500]="timeLeft <= 5"
                 [class.animate-pulse]="timeLeft <= 5">
              {{ timeLeft }}
            </div>
          }

          <!-- IVR Instructions -->
          <div class="fixed bottom-8 bg-black/50 backdrop-blur-sm px-8 py-4 rounded-full border border-white/10 text-xl font-bold flex items-center gap-4">
            <mat-icon class="text-pink-500">phone_in_talk</mat-icon>
            הזן את תשובתך בטלפון: הקש את מספר התשובה (1, 2, 3...)
          </div>

          <!-- Double Bet Indicator -->
          @if (currentQuestion.isDoubleBetEnabled) {
            <div class="fixed top-8 right-8 bg-pink-600 text-white px-6 py-3 rounded-full font-bold text-xl shadow-lg flex items-center gap-2 animate-bounce">
              <mat-icon>stars</mat-icon> הימור כפול!
            </div>
          }
        </div>
      }

      <!-- Leaderboard Overlay -->
      @if (showLeaderboard) {
        <div class="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8">
          <h2 class="text-5xl font-bold text-pink-500 mb-12 flex items-center gap-4">
            <mat-icon class="scale-150">emoji_events</mat-icon> טבלת מובילים
          </h2>
          
          <div class="w-full max-w-3xl bg-white/10 rounded-3xl overflow-hidden border border-white/20">
            <div class="grid grid-cols-12 gap-4 p-4 bg-white/10 font-bold text-xl border-b border-white/20">
              <div class="col-span-2 text-center">מקום</div>
              <div class="col-span-6">שם השחקן</div>
              <div class="col-span-2 text-center">ניקוד</div>
              <div class="col-span-2 text-center">זמן תגובה</div>
            </div>
            
            <div class="max-h-[60vh] overflow-y-auto">
              @for (player of getSortedPlayers(); track player.phone; let i = $index) {
                <div class="grid grid-cols-12 gap-4 p-4 border-b border-white/10 items-center text-lg transition-colors hover:bg-white/5"
                     [class.bg-purple-900/50]="i === 0"
                     [class.bg-purple-800/30]="i === 1"
                     [class.bg-purple-700/20]="i === 2">
                  <div class="col-span-2 text-center font-bold text-2xl" [class.text-yellow-400]="i === 0" [class.text-gray-300]="i === 1" [class.text-orange-400]="i === 2">
                    {{ i + 1 }}
                  </div>
                  <div class="col-span-6 font-semibold truncate">{{ player.name || player.phone }}</div>
                  <div class="col-span-2 text-center font-bold text-pink-400">{{ player.score }}</div>
                  <div class="col-span-2 text-center text-white/50 text-sm">{{ (player.time / 1000).toFixed(1) }}ש'</div>
                </div>
              } @empty {
                <div class="p-8 text-center text-white/50 text-xl">אין עדיין משתתפים</div>
              }
            </div>
          </div>
          
          <div class="mt-8 text-white/50 text-sm">לחץ F1 כדי לסגור</div>
        </div>
      }

      <!-- Payment Modal -->
      @if (showPaymentModal) {
        <div class="absolute inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
          <div class="bg-white text-black p-10 rounded-3xl max-w-md w-full text-center shadow-2xl">
            <mat-icon class="text-red-500 text-6xl mb-4">block</mat-icon>
            <h2 class="text-3xl font-bold mb-4">הגעת למגבלת המשתתפים</h2>
            <p class="text-gray-600 mb-8 text-lg">
              המשחק הגיע למעל 10 משתתפים. על מנת להמשיך, יש לבצע תשלום סמלי של 20 ש"ח.
            </p>
            <div class="flex flex-col gap-4">
              <button (click)="payNow()" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-xl transition-colors shadow-lg">
                לתשלום מאובטח
              </button>
              <button (click)="cancelGame()" class="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-colors">
                בטל משחק
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Pre-game Info -->
      @if (!showIntro && !currentQuestion && !showPaymentModal) {
        <div class="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center">
          <h1 class="text-6xl font-bold text-pink-500 mb-8">התחבר למשחק</h1>
          <p class="text-3xl mb-4">חיוג למספר: <span class="font-mono text-yellow-400">0772637288</span></p>
          <p class="text-3xl mb-12">קוד המשחק: <span class="font-mono text-yellow-400 text-5xl bg-white/10 px-6 py-2 rounded-2xl">{{ sessionId }}</span></p>
          
          <div class="bg-white/10 p-8 rounded-3xl max-w-2xl text-xl leading-relaxed border border-white/20">
            <p class="mb-4">לאחר החיוג, המערכת תבקש ממך להקיש את קוד המשחק שלך. הקש את המספרים שמופיעים למעלה.</p>
            <p class="mb-4">כאשר תשמע את השאלה, הקש את מספר התשובה הרצויה (1, 2, 3 או 4) בטלפון.</p>
            <p>כדי לשמוע את הניקוד שלך ואת מיקומך בטבלת המובילים, הקש כוכבית (*) בכל שלב במהלך המשחק.</p>
          </div>
          
          <button (click)="startFirstQuestion()" class="mt-12 bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-[0_0_30px_rgba(236,72,153,0.5)] transition-all hover:scale-105">
            התחל משחק
          </button>
        </div>
      }

    </div>
  `
})
export class QuizPlayerComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  user: User | null = null;
  quizId: string | null = null;
  sessionId: string = '';
  quiz: any = null;
  
  showIntro = true;
  currentQuestionIndex = -1;
  currentQuestion: any = null;
  
  timeLeft = 0;
  timerInterval: any;
  showAnswer = false;
  
  showLeaderboard = false;
  showPaymentModal = false;
  isExempt = false;
  
  socket: Socket | null = null;
  
  players = new Map<string, { phone: string, name: string, score: number, time: number, currentAnswer: string }>();
  pollResults = new Map<string, number>();

  ngOnInit() {
    this.quizId = this.route.snapshot.paramMap.get('id');
    this.sessionId = Math.floor(100000 + Math.random() * 900000).toString();
    
    const auth = getAuth();
    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        this.user = user;
        await this.checkExemptStatus();
        await this.loadQuiz();
        this.initSocket();
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.socket) this.socket.disconnect();
  }

  async checkExemptStatus() {
    if (!this.user?.email) return;
    const db = getFirestore();
    const docRef = doc(db, 'exemptAccounts', this.user.email);
    const docSnap = await getDoc(docRef);
    this.isExempt = docSnap.exists() || this.user.email === 'y15761576@gmail.com' || this.user.email === 'michali.miller1@gmail.com';
  }

  async loadQuiz() {
    if (!this.quizId) return;
    const db = getFirestore();
    const docRef = doc(db, 'quizzes', this.quizId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      this.quiz = docSnap.data();
    }
  }

  initSocket() {
    // Connect to the same host
    this.socket = io();
    
    this.socket.on('connect', () => {
      this.socket?.emit('host-game', { sessionId: this.sessionId, quizId: this.quizId });
    });

    this.socket.on('ivr-answer', (data: any) => {
      this.handleIvrAnswer(data);
    });
  }

  handleIvrAnswer(data: { phoneNumber: string, keyPressed: string, responseTime: number, timestamp: number }) {
    if (!this.players.has(data.phoneNumber)) {
      if (this.players.size >= 10 && !this.isExempt) {
        this.showPaymentModal = true;
        return;
      }
      this.players.set(data.phoneNumber, {
        phone: data.phoneNumber,
        name: `שחקן ${data.phoneNumber.slice(-4)}`,
        score: 0,
        time: 0,
        currentAnswer: ''
      });
    }

    const player = this.players.get(data.phoneNumber)!;
    
    // Only accept first answer per question
    if (!player.currentAnswer && !this.showAnswer && this.currentQuestion) {
      player.currentAnswer = data.keyPressed;
      player.time += data.responseTime;
      
      // Calculate score if correct
      if (this.currentQuestion.type !== 'poll') {
        const answerIndex = parseInt(data.keyPressed) - 1;
        if (answerIndex >= 0 && answerIndex < this.currentQuestion.answers.length) {
          if (this.currentQuestion.answers[answerIndex].isCorrect) {
            let points = this.quiz.baseRegularScore || 1;
            if (this.currentQuestion.isDoubleBetEnabled) points *= 2;
            player.score += points;
          }
        }
      } else {
        // Record poll vote
        const count = this.pollResults.get(data.keyPressed) || 0;
        this.pollResults.set(data.keyPressed, count + 1);
      }
    }
  }

  onIntroEnded() {
    this.showIntro = false;
  }

  startFirstQuestion() {
    this.nextQuestion();
  }

  nextQuestion() {
    if (!this.quiz || !this.quiz.questions) return;
    
    this.currentQuestionIndex++;
    if (this.currentQuestionIndex < this.quiz.questions.length) {
      this.currentQuestion = this.quiz.questions[this.currentQuestionIndex];
      this.showAnswer = false;
      this.timeLeft = this.currentQuestion.timerSeconds || 15;
      this.pollResults.clear();
      
      // Reset player current answers
      for (const player of this.players.values()) {
        player.currentAnswer = '';
      }

      this.socket?.emit('start-question', { sessionId: this.sessionId, questionIndex: this.currentQuestionIndex });
      this.startTimer();
    } else {
      // End of quiz
      this.currentQuestion = null;
      this.showLeaderboard = true;
    }
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.revealAnswer();
      }
    }, 1000);
  }

  revealAnswer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.showAnswer = true;
    // Play sound effect here if needed
  }

  getSortedPlayers() {
    return Array.from(this.players.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.time - b.time; // Lower time is better
    });
  }

  getPollPercentage(index: number): number {
    const key = (index + 1).toString();
    const votes = this.pollResults.get(key) || 0;
    let total = 0;
    for (const v of this.pollResults.values()) total += v;
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  }

  payNow() {
    // Mock payment flow
    alert('מועבר לתשלום מאובטח... (סימולציה)');
    setTimeout(() => {
      alert('התשלום בוצע בהצלחה!');
      this.isExempt = true; // Temporary exempt for this session
      this.showPaymentModal = false;
    }, 1500);
  }

  cancelGame() {
    this.router.navigate(['/profile']);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.showPaymentModal) return;

    switch (event.key) {
      case 'F1':
        event.preventDefault();
        this.showLeaderboard = !this.showLeaderboard;
        break;
      case 'F2':
        event.preventDefault();
        if (this.currentQuestionIndex > 0) {
          this.currentQuestionIndex -= 2; // Go back 2, then nextQuestion adds 1
          this.nextQuestion();
        }
        break;
      case 'F3':
        event.preventDefault();
        this.router.navigate(['/profile']);
        break;
      case 'F4':
        event.preventDefault();
        if (this.timeLeft > 0 && !this.showAnswer) {
          this.revealAnswer();
        } else if (this.showAnswer) {
          this.nextQuestion();
        }
        break;
      case 'F5':
        event.preventDefault();
        if (this.showAnswer) this.nextQuestion();
        break;
      case ' ': // Space
        if (this.showIntro) {
          const video = document.querySelector('video');
          if (video) {
            if (video.paused) video.play();
            else video.pause();
          }
        }
        break;
      case 'Escape':
        this.router.navigate(['/profile']);
        break;
    }
  }
}
