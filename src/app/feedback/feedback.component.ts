import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [MatIconModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex flex-col items-center justify-center p-4" dir="rtl">
      <div class="bg-white p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-2xl text-center">
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-3xl font-bold text-purple-900 flex items-center gap-3">
            <mat-icon class="scale-150">rate_review</mat-icon> שתף אותנו בדעתך!
          </h1>
          <a routerLink="/" class="text-purple-500 hover:text-purple-700 transition-colors">חזור לדף הבית</a>
        </div>
        
        @if (isSubmitted) {
          <div class="bg-pink-50 border-2 border-pink-200 text-pink-800 p-8 rounded-2xl animate-fade-in">
            <mat-icon class="text-6xl mb-4 text-pink-500">favorite</mat-icon>
            <h2 class="text-3xl font-bold mb-2">תודה על המשוב!</h2>
            <p class="text-lg">הוא יסייע לנו לשפר את האתר ולהעניק חוויה טובה יותר.</p>
            <button (click)="resetForm()" class="mt-8 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-xl transition-colors">
              שלח משוב נוסף
            </button>
          </div>
        } @else {
          <div class="space-y-8">
            <div>
              <label class="block text-purple-800 font-bold mb-4 text-xl">איך היית מדרג את החוויה שלך?</label>
              <div class="flex justify-center gap-2 text-gray-300">
                @for (star of [1,2,3,4,5]; track star) {
                  <button (click)="setRating(star)" (mouseenter)="hoverRating = star" (mouseleave)="hoverRating = 0" class="focus:outline-none transition-transform hover:scale-110">
                    <mat-icon class="text-5xl" [class.text-yellow-400]="star <= (hoverRating || rating)">star</mat-icon>
                  </button>
                }
              </div>
            </div>
            
            <div class="text-right">
              <label class="block text-purple-800 font-bold mb-2">נשמח לשמוע פירוט (אופציונלי)</label>
              <textarea [(ngModel)]="feedbackText" rows="5" placeholder="ספר לנו מה אהבת ומה אפשר לשפר..." class="w-full border-2 border-purple-200 rounded-xl p-4 font-semibold text-purple-900 focus:border-purple-500 outline-none transition-colors resize-none"></textarea>
            </div>
            
            <button (click)="submitFeedback()" [disabled]="rating === 0" class="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 text-xl">
              <mat-icon>send</mat-icon> שלח משוב
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class FeedbackComponent {
  isSubmitted = false;
  rating = 0;
  hoverRating = 0;
  feedbackText = '';

  setRating(star: number) {
    this.rating = star;
  }

  async submitFeedback() {
    if (this.rating === 0) return;

    const auth = getAuth();
    const user = auth.currentUser;
    const db = getFirestore();

    const feedbackData = {
      feedbackId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      userId: user?.uid || null,
      email: user?.email || null,
      rating: this.rating,
      feedbackText: this.feedbackText || 'ללא פירוט',
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'feedbacks'), feedbackData);
      this.isSubmitted = true;
    } catch (error) {
      console.error('Error submitting feedback', error);
      alert('שגיאה בשליחת המשוב. אנא נסה שוב.');
    }
  }

  resetForm() {
    this.isSubmitted = false;
    this.rating = 0;
    this.feedbackText = '';
  }
}
