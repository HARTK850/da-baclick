import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex flex-col items-center justify-center p-4" dir="rtl">
      <div class="bg-white p-12 rounded-3xl shadow-xl w-full max-w-md text-center">
        <h1 class="text-3xl font-bold text-purple-900 mb-8">ברוכים הבאים לדע בקליק!</h1>
        
        <p class="text-gray-600 mb-8">עליך להתחבר כדי להשתמש באתר.</p>

        <button (click)="loginWithGoogle()" class="w-full bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-800 font-bold py-4 px-8 rounded-2xl shadow-sm transition-all duration-300 flex items-center justify-center gap-4">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" class="w-6 h-6">
          התחבר/הירשם באמצעות גוגל
        </button>
      </div>
    </div>
  `
})
export class LoginComponent {
  private router = inject(Router);

  async loginWithGoogle() {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          profilePictureUrl: user.photoURL,
          role: 'user',
          defaultTimerSeconds: 15,
          defaultScoreMethod: 'regular',
          purchasedGamesCount: 0,
          freeGamesEarned: 0,
          gameCredits: 0
        });
      }
      
      this.router.navigate(['/profile']);
    } catch (error) {
      console.error('Login failed', error);
      alert('ההתחברות נכשלה. אנא נסה שוב.');
    }
  }
}
