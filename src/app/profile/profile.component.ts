import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { getAuth, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [MatIconModule, RouterLink, FormsModule, DatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-8" dir="rtl">
      <div class="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        
        <!-- Header -->
        <div class="bg-purple-600 p-8 text-white flex items-center justify-between">
          <div class="flex items-center gap-6">
            <img [src]="user?.photoURL || 'https://picsum.photos/seed/user/100/100'" alt="Profile" class="w-24 h-24 rounded-full border-4 border-white shadow-md">
            <div>
              <h1 class="text-3xl font-bold">{{ user?.displayName || 'משתמש' }}</h1>
              <p class="text-purple-200">{{ user?.email }}</p>
            </div>
          </div>
          <div class="flex gap-4">
            @if (isAdmin) {
              <a routerLink="/admin" class="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-all flex items-center gap-2">
                <mat-icon>admin_panel_settings</mat-icon>
                ממשק ניהול
              </a>
            }
            <button (click)="logout()" class="bg-purple-800 hover:bg-purple-900 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-all flex items-center gap-2">
              <mat-icon>logout</mat-icon>
              התנתק
            </button>
          </div>
        </div>

        <div class="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Settings -->
          <div class="md:col-span-1 bg-purple-50 p-6 rounded-2xl">
            <h2 class="text-2xl font-bold text-purple-900 mb-6 flex items-center gap-2">
              <mat-icon>settings</mat-icon>
              הגדרות כלליות
            </h2>
            
            <div class="mb-6">
              <label class="block text-purple-800 font-semibold mb-2">זמן ברירת מחדל לשאלה (שניות)</label>
              <div class="flex items-center gap-2">
                <button (click)="updateTimer(-5)" class="bg-purple-200 hover:bg-purple-300 text-purple-800 p-2 rounded-lg font-bold">-</button>
                <input type="number" [(ngModel)]="defaultTimer" (change)="saveSettings()" class="w-20 text-center border-2 border-purple-200 rounded-lg p-2 font-bold text-purple-900">
                <button (click)="updateTimer(5)" class="bg-purple-200 hover:bg-purple-300 text-purple-800 p-2 rounded-lg font-bold">+</button>
              </div>
            </div>
            
            <div class="mb-6">
              <label class="block text-purple-800 font-semibold mb-2">שיטת ניקוד ברירת מחדל</label>
              <select [(ngModel)]="defaultScoreMethod" (change)="saveSettings()" class="w-full border-2 border-purple-200 rounded-lg p-2 font-bold text-purple-900">
                <option value="regular">רגילה</option>
                <option value="winning_percentage">אחוז מנצח</option>
              </select>
            </div>
          </div>

          <!-- Quizzes List -->
          <div class="md:col-span-2">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold text-purple-900 flex items-center gap-2">
                <mat-icon>quiz</mat-icon>
                החידונים שלי
              </h2>
              <a routerLink="/editor" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-all flex items-center gap-2">
                <mat-icon>add</mat-icon>
                צור חידון חדש
              </a>
            </div>

            <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              @for (quiz of quizzes; track quiz.quizId) {
                <div class="bg-white border-2 border-purple-100 hover:border-purple-300 p-6 rounded-2xl shadow-sm transition-all flex justify-between items-center cursor-pointer group" (click)="editQuiz(quiz.quizId)">
                  <div>
                    <h3 class="text-xl font-bold text-purple-900 mb-1 group-hover:text-purple-600 transition-colors">{{ quiz.quizName }}</h3>
                    <p class="text-purple-500 text-sm flex items-center gap-4">
                      <span class="flex items-center gap-1"><mat-icon class="scale-75">calendar_today</mat-icon> {{ quiz.createdAt | date:'shortDate' }}</span>
                      <span class="flex items-center gap-1"><mat-icon class="scale-75">format_list_numbered</mat-icon> {{ quiz.questions.length }} שאלות</span>
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <button (click)="$event.stopPropagation(); playQuiz(quiz.quizId)" class="bg-pink-100 hover:bg-pink-200 text-pink-600 p-3 rounded-xl transition-all" title="הפעל חידון">
                      <mat-icon>play_arrow</mat-icon>
                    </button>
                    <button (click)="$event.stopPropagation(); editQuiz(quiz.quizId)" class="bg-purple-100 hover:bg-purple-200 text-purple-600 p-3 rounded-xl transition-all" title="ערוך חידון">
                      <mat-icon>edit</mat-icon>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="text-center py-12 bg-purple-50 rounded-2xl border-2 border-dashed border-purple-200">
                  <mat-icon class="text-purple-300 text-6xl mb-4">sentiment_dissatisfied</mat-icon>
                  <h3 class="text-xl font-bold text-purple-800 mb-2">עדיין לא יצרת חידונים</h3>
                  <p class="text-purple-600">לחץ על הכפתור למעלה כדי ליצור את החידון הראשון שלך!</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private router = inject(Router);
  user: User | null = null;
  isAdmin = false;
  quizzes: any[] = [];
  
  defaultTimer = 15;
  defaultScoreMethod = 'regular';

  ngOnInit() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        this.user = user;
        await this.loadUserProfile();
        await this.loadQuizzes();
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  async loadUserProfile() {
    if (!this.user) return;
    const db = getFirestore();
    const userRef = doc(db, 'users', this.user.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      this.isAdmin = data['role'] === 'admin' || this.user.email === 'y15761576@gmail.com' || this.user.email === 'michali.miller1@gmail.com';
      this.defaultTimer = data['defaultTimerSeconds'] || 15;
      this.defaultScoreMethod = data['defaultScoreMethod'] || 'regular';
    }
  }

  async loadQuizzes() {
    if (!this.user) return;
    const db = getFirestore();
    const q = query(collection(db, 'quizzes'), where('userId', '==', this.user.uid));
    const querySnapshot = await getDocs(q);
    this.quizzes = querySnapshot.docs.map(doc => ({ quizId: doc.id, ...doc.data() }));
  }

  async saveSettings() {
    if (!this.user) return;
    const db = getFirestore();
    const userRef = doc(db, 'users', this.user.uid);
    await updateDoc(userRef, {
      defaultTimerSeconds: this.defaultTimer,
      defaultScoreMethod: this.defaultScoreMethod
    });
  }

  updateTimer(amount: number) {
    this.defaultTimer = Math.max(5, this.defaultTimer + amount);
    this.saveSettings();
  }

  editQuiz(quizId: string) {
    this.router.navigate(['/editor', quizId]);
  }

  playQuiz(quizId: string) {
    this.router.navigate(['/play', quizId]);
  }

  async logout() {
    const auth = getAuth();
    await signOut(auth);
    this.router.navigate(['/']);
  }
}
