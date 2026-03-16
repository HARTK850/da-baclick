import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [MatIconModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex flex-col items-center justify-center p-4" dir="rtl">
      <div class="bg-white p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-2xl">
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-3xl font-bold text-purple-900 flex items-center gap-3">
            <mat-icon class="scale-150">mail</mat-icon> צרו קשר
          </h1>
          <a routerLink="/" class="text-purple-500 hover:text-purple-700 transition-colors">חזור לדף הבית</a>
        </div>
        
        @if (isSubmitted) {
          <div class="bg-green-50 border-2 border-green-200 text-green-800 p-6 rounded-2xl text-center animate-fade-in">
            <mat-icon class="text-6xl mb-4 text-green-500">check_circle</mat-icon>
            <h2 class="text-2xl font-bold mb-2">הודעתך נשלחה בהצלחה!</h2>
            <p>נחזור אליך בהקדם לכתובת המייל שסיפקת.</p>
            <button (click)="resetForm()" class="mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl transition-colors">
              שלח הודעה נוספת
            </button>
          </div>
        } @else {
          <form (ngSubmit)="submitForm()" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-purple-800 font-bold mb-2">שם מלא</label>
                <input type="text" [(ngModel)]="contactData.name" name="name" required class="w-full border-2 border-purple-200 rounded-xl p-3 font-semibold text-purple-900 focus:border-purple-500 outline-none transition-colors">
              </div>
              <div>
                <label class="block text-purple-800 font-bold mb-2">כתובת מייל</label>
                <input type="email" [(ngModel)]="contactData.email" name="email" required class="w-full border-2 border-purple-200 rounded-xl p-3 font-semibold text-purple-900 focus:border-purple-500 outline-none transition-colors">
              </div>
            </div>
            
            <div>
              <label class="block text-purple-800 font-bold mb-2">נושא ההודעה</label>
              <input type="text" [(ngModel)]="contactData.subject" name="subject" required class="w-full border-2 border-purple-200 rounded-xl p-3 font-semibold text-purple-900 focus:border-purple-500 outline-none transition-colors">
            </div>
            
            <div>
              <label class="block text-purple-800 font-bold mb-2">תוכן ההודעה</label>
              <textarea [(ngModel)]="contactData.message" name="message" rows="5" required class="w-full border-2 border-purple-200 rounded-xl p-3 font-semibold text-purple-900 focus:border-purple-500 outline-none transition-colors resize-none"></textarea>
            </div>
            
            <button type="submit" [disabled]="!isValid()" class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 text-lg">
              <mat-icon>send</mat-icon> שלח הודעה
            </button>
          </form>
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
export class ContactComponent {
  isSubmitted = false;
  contactData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  isValid() {
    return this.contactData.name && this.contactData.email.includes('@') && this.contactData.subject && this.contactData.message;
  }

  submitForm() {
    if (this.isValid()) {
      // Here you would typically send the data to your backend
      // For now, we just show the success message
      this.isSubmitted = true;
    }
  }

  resetForm() {
    this.isSubmitted = false;
    this.contactData = { name: '', email: '', subject: '', message: '' };
  }
}
