import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [MatIconModule, FormsModule, CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-8" dir="rtl">
      <div class="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        
        <!-- Header -->
        <div class="bg-purple-800 p-8 text-white flex items-center justify-between">
          <h1 class="text-3xl font-bold flex items-center gap-3">
            <mat-icon class="scale-150">admin_panel_settings</mat-icon>
            ממשק ניהול - דע בקליק
          </h1>
          <button (click)="goBack()" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-all flex items-center gap-2">
            <mat-icon>arrow_forward</mat-icon>
            חזור לפרופיל
          </button>
        </div>

        <div class="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Left Column: Stats & Exemptions -->
          <div class="lg:col-span-1 space-y-8">
            
            <!-- Average Rating -->
            <div class="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 text-center">
              <h2 class="text-xl font-bold text-purple-900 mb-4">ממוצע דירוגים כללי</h2>
              <div class="text-6xl font-extrabold text-pink-500 mb-2">{{ averageRating | number:'1.1-1' }}</div>
              <div class="flex justify-center gap-1 text-yellow-400">
                @for (star of [1,2,3,4,5]; track star) {
                  <mat-icon [class.text-gray-300]="star > averageRating">star</mat-icon>
                }
              </div>
              <p class="text-purple-600 mt-2">מתוך {{ feedbacks.length }} משובים</p>
            </div>

            <!-- Exempt Accounts -->
            <div class="bg-white p-6 rounded-2xl border-2 border-purple-100 shadow-sm">
              <h2 class="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                <mat-icon>money_off</mat-icon>
                ניהול חשבונות פטורים
              </h2>
              
              <div class="flex gap-2 mb-6">
                <input type="email" [(ngModel)]="newExemptEmail" placeholder="הזן כתובת מייל..." class="flex-1 border-2 border-purple-200 rounded-xl p-2 font-semibold text-purple-900 focus:border-purple-500 outline-none">
                <button (click)="addExemptAccount()" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl transition-colors">
                  הוסף
                </button>
              </div>

              <div class="space-y-2 max-h-64 overflow-y-auto pr-2">
                @for (account of exemptAccounts; track account.email) {
                  <div class="flex justify-between items-center bg-purple-50 p-3 rounded-xl border border-purple-100">
                    <span class="font-mono text-sm text-purple-800 truncate">{{ account.email }}</span>
                    <button (click)="removeExemptAccount(account.email)" class="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
                      <mat-icon class="scale-75">delete</mat-icon>
                    </button>
                  </div>
                } @empty {
                  <p class="text-center text-purple-400 py-4">אין חשבונות פטורים</p>
                }
              </div>
            </div>
          </div>

          <!-- Right Column: Feedbacks -->
          <div class="lg:col-span-2">
            <div class="bg-white p-6 rounded-2xl border-2 border-purple-100 shadow-sm h-full flex flex-col">
              <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-purple-900 flex items-center gap-2">
                  <mat-icon>forum</mat-icon>
                  משובים מהמשתמשים
                </h2>
                
                <div class="flex gap-4">
                  <select [(ngModel)]="filterRating" class="border-2 border-purple-200 rounded-xl p-2 text-purple-900 font-semibold outline-none focus:border-purple-500">
                    <option value="all">הצג הכל</option>
                    <option value="1">1 כוכב</option>
                    <option value="2">2 כוכבים</option>
                    <option value="3">3 כוכבים</option>
                    <option value="4">4 כוכבים</option>
                    <option value="5">5 כוכבים</option>
                  </select>
                  
                  <div class="relative">
                    <mat-icon class="absolute right-3 top-2.5 text-purple-400 scale-75">search</mat-icon>
                    <input type="text" [(ngModel)]="searchQuery" placeholder="חיפוש במשובים..." class="pl-4 pr-10 py-2 border-2 border-purple-200 rounded-xl font-semibold text-purple-900 focus:border-purple-500 outline-none w-64">
                  </div>
                </div>
              </div>

              <div class="flex-1 overflow-y-auto pr-2 space-y-4">
                @for (feedback of filteredFeedbacks; track feedback.feedbackId) {
                  <div class="bg-purple-50 p-5 rounded-2xl border border-purple-100 hover:border-purple-300 transition-colors">
                    <div class="flex justify-between items-start mb-3">
                      <div>
                        <div class="font-bold text-purple-900">{{ feedback.email || 'משתמש אנונימי' }}</div>
                        <div class="text-xs text-purple-500">{{ feedback.createdAt | date:'short' }}</div>
                      </div>
                      <div class="flex text-yellow-400">
                        @for (star of [1,2,3,4,5]; track star) {
                          <mat-icon class="scale-75" [class.text-gray-300]="star > feedback.rating">star</mat-icon>
                        }
                      </div>
                    </div>
                    <p class="text-purple-800 whitespace-pre-wrap">{{ feedback.feedbackText }}</p>
                  </div>
                } @empty {
                  <div class="text-center py-12 text-purple-400">
                    <mat-icon class="text-6xl mb-4 opacity-50">speaker_notes_off</mat-icon>
                    <p>לא נמצאו משובים התואמים לסינון</p>
                  </div>
                }
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  private router = inject(Router);
  
  user: User | null = null;
  feedbacks: any[] = [];
  exemptAccounts: any[] = [];
  
  averageRating = 0;
  newExemptEmail = '';
  
  filterRating = 'all';
  searchQuery = '';

  ngOnInit() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        // Check if admin
        if (user.email === 'y15761576@gmail.com' || user.email === 'michali.miller1@gmail.com') {
          this.user = user;
          await this.loadData();
        } else {
          alert('אין לך הרשאות גישה לדף זה');
          this.router.navigate(['/profile']);
        }
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  async loadData() {
    const db = getFirestore();
    
    // Load Feedbacks
    const feedbacksSnap = await getDocs(query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc')));
    this.feedbacks = feedbacksSnap.docs.map((doc: any) => doc.data());
    
    if (this.feedbacks.length > 0) {
      const sum = this.feedbacks.reduce((acc, curr) => acc + curr['rating'], 0);
      this.averageRating = sum / this.feedbacks.length;
    }

    // Load Exempt Accounts
    const exemptSnap = await getDocs(collection(db, 'exemptAccounts'));
    this.exemptAccounts = exemptSnap.docs.map((doc: any) => doc.data());
  }

  get filteredFeedbacks() {
    return this.feedbacks.filter(f => {
      const matchesRating = this.filterRating === 'all' || f['rating'].toString() === this.filterRating;
      const matchesSearch = !this.searchQuery || f['feedbackText'].toLowerCase().includes(this.searchQuery.toLowerCase()) || (f['email'] && f['email'].toLowerCase().includes(this.searchQuery.toLowerCase()));
      return matchesRating && matchesSearch;
    });
  }

  async addExemptAccount() {
    if (!this.newExemptEmail || !this.newExemptEmail.includes('@')) {
      alert('אנא הזן כתובת מייל תקינה');
      return;
    }
    
    const db = getFirestore();
    try {
      await setDoc(doc(db, 'exemptAccounts', this.newExemptEmail), { email: this.newExemptEmail });
      this.exemptAccounts.push({ email: this.newExemptEmail });
      this.newExemptEmail = '';
    } catch (error) {
      console.error('Error adding exempt account', error);
      alert('שגיאה בהוספת החשבון');
    }
  }

  async removeExemptAccount(email: string) {
    if (confirm(`האם אתה בטוח שברצונך להסיר את ${email} מרשימת הפטורים?`)) {
      const db = getFirestore();
      try {
        await deleteDoc(doc(db, 'exemptAccounts', email));
        this.exemptAccounts = this.exemptAccounts.filter(a => a.email !== email);
      } catch (error) {
        console.error('Error removing exempt account', error);
        alert('שגיאה בהסרת החשבון');
      }
    }
  }

  goBack() {
    this.router.navigate(['/profile']);
  }
}
