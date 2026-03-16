import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex flex-col items-center justify-center p-4 text-center" dir="rtl">
      <!-- Animated Logo Placeholder -->
      <div class="mb-8 w-64 h-64 bg-purple-300 rounded-full flex items-center justify-center shadow-lg animate-pulse">
        <span class="text-4xl font-bold text-purple-800">דע בקליק</span>
      </div>

      <h1 class="text-4xl md:text-6xl font-extrabold text-purple-900 mb-4 tracking-tight">
        ידעת, והקלקת, תאמין.
      </h1>
      
      <p class="text-xl text-purple-700 mb-12 max-w-2xl">
        פלטפורמת חידונים אינטראקטיבית ודינמית לכל המשפחה, חברים ואירועים.
      </p>

      <div class="flex flex-col sm:flex-row gap-6 w-full max-w-md justify-center">
        <a routerLink="/editor" class="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-2xl shadow-md transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2">
          <mat-icon>add_circle</mat-icon>
          צור חידון חדש
        </a>
        <a routerLink="/profile" class="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 px-8 rounded-2xl shadow-md transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2">
          <mat-icon>play_circle</mat-icon>
          הפעל חידון קיים
        </a>
      </div>
    </div>
  `
})
export class HomeComponent {}
