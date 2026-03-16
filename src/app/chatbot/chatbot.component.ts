import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [MatIconModule, FormsModule, CommonModule],
  template: `
    @if (showChatbot) {
      <div class="fixed bottom-6 left-6 z-50 flex flex-col items-start" dir="rtl">
        
        <!-- Chat Window -->
        @if (isOpen) {
          <div class="bg-white rounded-3xl shadow-2xl w-80 mb-4 overflow-hidden border-2 border-purple-100 flex flex-col h-96 animate-slide-up">
            
            <!-- Header -->
            <div class="bg-purple-600 text-white p-4 flex justify-between items-center">
              <div class="flex items-center gap-2 font-bold">
                <mat-icon>smart_toy</mat-icon>
                עוזר וירטואלי
              </div>
              <button (click)="toggleChat()" class="hover:bg-purple-700 p-1 rounded-full transition-colors">
                <mat-icon class="scale-75">close</mat-icon>
              </button>
            </div>
            
            <!-- Messages -->
            <div class="flex-1 p-4 overflow-y-auto bg-purple-50 flex flex-col gap-3">
              @for (msg of messages; track $index) {
                <div [class.self-end]="msg.isUser" [class.self-start]="!msg.isUser" class="max-w-[80%]">
                  <div class="p-3 rounded-2xl text-sm"
                       [class.bg-purple-600]="msg.isUser" [class.text-white]="msg.isUser" [class.rounded-br-sm]="msg.isUser"
                       [class.bg-white]="!msg.isUser" [class.text-purple-900]="!msg.isUser" [class.rounded-bl-sm]="!msg.isUser" [class.border]="!msg.isUser" [class.border-purple-100]="!msg.isUser">
                    {{ msg.text }}
                    
                    @if (msg.action === 'add_question') {
                      <button (click)="navigate('/editor')" class="mt-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-lg font-bold hover:bg-purple-200 w-full">לעורך החידונים</button>
                    }
                    @if (msg.action === 'feedback') {
                      <button (click)="navigate('/feedback')" class="mt-2 text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded-lg font-bold hover:bg-pink-200 w-full">לדף המשוב</button>
                    }
                    @if (msg.action === 'profile') {
                      <button (click)="navigate('/profile')" class="mt-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-lg font-bold hover:bg-purple-200 w-full">לפרופיל שלי</button>
                    }
                    @if (msg.action === 'admin') {
                      <button (click)="navigate('/admin')" class="mt-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-lg font-bold hover:bg-purple-200 w-full">לממשק הניהול</button>
                    }
                  </div>
                </div>
              }
            </div>
            
            <!-- Input -->
            <div class="p-3 bg-white border-t border-purple-100 flex items-center gap-2">
              <input type="text" [(ngModel)]="userInput" (keyup.enter)="sendMessage()" placeholder="הקלד הודעה..." class="flex-1 border-none bg-purple-50 rounded-xl px-4 py-2 text-sm focus:ring-0 outline-none text-purple-900">
              <button (click)="sendMessage()" [disabled]="!userInput.trim()" class="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white p-2 rounded-xl transition-colors flex items-center justify-center">
                <mat-icon class="scale-75">send</mat-icon>
              </button>
            </div>
            
          </div>
        }

        <!-- Floating Button -->
        <button (click)="toggleChat()" class="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-300 relative group">
          <mat-icon class="text-3xl">{{ isOpen ? 'close' : 'chat' }}</mat-icon>
          @if (!isOpen) {
            <span class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce">1</span>
          }
        </button>
      </div>
    }
  `,
  styles: [`
    .animate-slide-up {
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: bottom left;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: scale(0.9) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class ChatbotComponent {
  private router = inject(Router);
  
  showChatbot = true;
  isOpen = false;
  userInput = '';
  
  messages: { text: string, isUser: boolean, action?: string }[] = [
    { text: 'שלום! אני העוזר הוירטואלי של דע בקליק. איך אוכל לעזור לך היום?', isUser: false }
  ];

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Hide chatbot on play page
        this.showChatbot = !event.urlAfterRedirects.includes('/play/');
        if (!this.showChatbot) this.isOpen = false;
      }
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text) return;

    this.messages.push({ text, isUser: true });
    this.userInput = '';

    // Simple keyword-based AI logic
    setTimeout(() => {
      this.processInput(text.toLowerCase());
    }, 500);
  }

  processInput(input: string) {
    let response = 'לא הבנתי בדיוק. תוכל לנסח מחדש?';
    let action: string | undefined;

    if (input.includes('הוסף שאלה') || input.includes('ליצור שאלה') || input.includes('חידון חדש')) {
      response = 'בשמחה! תוכל להוסיף שאלות בעורך החידונים. לחץ על הכפתור למטה כדי לעבור לשם.';
      action = 'add_question';
    } else if (input.includes('משוב') || input.includes('לדרג') || input.includes('תלונה')) {
      response = 'נשמח לשמוע את דעתך! תוכל להשאיר משוב בדף הייעודי.';
      action = 'feedback';
    } else if (input.includes('פרופיל') || input.includes('החשבון שלי') || input.includes('הגדרות')) {
      response = 'הנה קישור מהיר לפרופיל שלך.';
      action = 'profile';
    } else if (input.includes('ניהול') || input.includes('אדמין')) {
      response = 'אם יש לך הרשאות מתאימות, תוכל לגשת לממשק הניהול כאן.';
      action = 'admin';
    } else if (input.includes('וידאו') || input.includes('תמונה') || input.includes('שמע')) {
      response = 'כדי להוסיף מדיה לשאלה, בחר בסוג השאלה המתאים בעורך (למשל "וידאו") והדבק את הקישור (URL) של המדיה בשדה שיופיע.';
    } else if (input.includes('הימור כפול')) {
      response = 'הימור כפול היא אפשרות שניתן להפעיל לכל שאלה בנפרד בעורך. היא מכפילה את הניקוד שהמשתתפים מקבלים על תשובה נכונה!';
    } else if (input.includes('שלום') || input.includes('היי')) {
      response = 'שלום גם לך! איך אוכל לעזור?';
    }

    this.messages.push({ text: response, isUser: false, action });
    
    // Scroll to bottom
    setTimeout(() => {
      const chatContainer = document.querySelector('.overflow-y-auto');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  }

  navigate(path: string) {
    this.router.navigate([path]);
    this.isOpen = false;
  }
}
