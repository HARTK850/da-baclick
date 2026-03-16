import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import * as XLSX from 'xlsx';

interface Answer {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  type: 'regular' | 'image' | 'video' | 'audio' | 'poll';
  content: string;
  mediaUrl?: string;
  answers: Answer[];
  timerSeconds: number;
  isDoubleBetEnabled: boolean;
}

@Component({
  selector: 'app-quiz-editor',
  standalone: true,
  imports: [MatIconModule, FormsModule, DragDropModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-4 md:p-8" dir="rtl">
      <div class="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[90vh]">
        
        <!-- Left Sidebar: Question List -->
        <div class="w-full md:w-1/3 bg-purple-50 border-l-2 border-purple-100 flex flex-col h-full">
          <div class="p-6 bg-purple-600 text-white flex justify-between items-center">
            <h2 class="text-2xl font-bold flex items-center gap-2"><mat-icon>list</mat-icon> שאלות</h2>
            <button (click)="addNewQuestion()" class="bg-pink-500 hover:bg-pink-600 p-2 rounded-xl transition-all shadow-md" title="הוסף שאלה">
              <mat-icon>add</mat-icon>
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-4" cdkDropList (cdkDropListDropped)="drop($event)">
            @for (q of questions; track q.id; let i = $index) {
              <div cdkDrag class="bg-white p-4 rounded-2xl shadow-sm mb-4 border-2 border-transparent hover:border-purple-300 cursor-move transition-all group" [class.border-purple-500]="selectedQuestion?.id === q.id" (click)="selectQuestion(q)">
                <div class="flex justify-between items-start mb-2">
                  <span class="bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full text-sm">שאלה {{ i + 1 }}</span>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="$event.stopPropagation(); duplicateQuestion(q)" class="text-purple-500 hover:text-purple-700 p-1" title="שכפל"><mat-icon class="scale-75">content_copy</mat-icon></button>
                    <button (click)="$event.stopPropagation(); deleteQuestion(q)" class="text-red-500 hover:text-red-700 p-1" title="מחק"><mat-icon class="scale-75">delete</mat-icon></button>
                  </div>
                </div>
                <p class="text-purple-900 font-semibold truncate">{{ q.content || 'שאלה חדשה...' }}</p>
                <div class="flex items-center gap-4 mt-2 text-sm text-purple-500">
                  <span class="flex items-center gap-1"><mat-icon class="scale-75">{{ getIconForType(q.type) }}</mat-icon> {{ getTypeName(q.type) }}</span>
                  <span class="flex items-center gap-1"><mat-icon class="scale-75">timer</mat-icon> {{ q.timerSeconds }}ש'</span>
                </div>
              </div>
            } @empty {
              <div class="text-center py-12 text-purple-400">
                <mat-icon class="text-6xl mb-4 opacity-50">post_add</mat-icon>
                <p>אין שאלות בחידון.</p>
                <p>לחץ על הפלוס למעלה כדי להתחיל.</p>
              </div>
            }
          </div>
          
          <div class="p-4 bg-white border-t-2 border-purple-100 flex flex-col gap-2">
            <button (click)="saveQuiz()" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2">
              <mat-icon>save</mat-icon> שמור חידון
            </button>
            <div class="flex gap-2">
              <button (click)="importExcel()" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 text-sm">
                <mat-icon class="scale-75">upload_file</mat-icon> ייבא מאקסל
              </button>
              <button (click)="clearQuiz()" class="flex-1 bg-red-100 hover:bg-red-200 text-red-600 font-bold py-2 px-4 rounded-xl shadow-md transition-all flex justify-center items-center gap-2 text-sm">
                <mat-icon class="scale-75">delete_sweep</mat-icon> נקה הכל
              </button>
            </div>
            <input type="file" id="excelUpload" class="hidden" accept=".xlsx, .xls, .csv" (change)="onFileSelected($event)">
          </div>
        </div>

        <!-- Right Area: Editor -->
        <div class="w-full md:w-2/3 bg-white p-6 md:p-10 overflow-y-auto flex flex-col">
          <div class="mb-8 flex justify-between items-center border-b-2 border-purple-100 pb-4">
            <input type="text" [(ngModel)]="quizName" placeholder="שם החידון..." class="text-3xl font-extrabold text-purple-900 bg-transparent border-none focus:ring-0 placeholder-purple-300 w-full outline-none">
            <a routerLink="/profile" class="text-purple-500 hover:text-purple-700 transition-colors flex items-center gap-1 whitespace-nowrap bg-purple-50 px-4 py-2 rounded-xl">
              <mat-icon>arrow_forward</mat-icon> חזור לפרופיל
            </a>
          </div>

          @if (selectedQuestion) {
            <div class="flex-1 flex flex-col gap-8 animate-fade-in">
              <!-- Question Type -->
              <div class="flex flex-wrap gap-2">
                @for (type of questionTypes; track type.value) {
                  <button (click)="selectedQuestion.type = type.value" 
                          class="px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all border-2"
                          [class.bg-purple-100]="selectedQuestion.type === type.value"
                          [class.border-purple-500]="selectedQuestion.type === type.value"
                          [class.text-purple-800]="selectedQuestion.type === type.value"
                          [class.bg-white]="selectedQuestion.type !== type.value"
                          [class.border-gray-200]="selectedQuestion.type !== type.value"
                          [class.text-gray-500]="selectedQuestion.type !== type.value">
                    <mat-icon class="scale-75">{{ type.icon }}</mat-icon> {{ type.label }}
                  </button>
                }
              </div>

              <!-- Question Content -->
              <div>
                <label class="block text-purple-800 font-bold mb-2 text-lg">תוכן השאלה</label>
                <textarea [(ngModel)]="selectedQuestion.content" rows="3" placeholder="הקלד את השאלה כאן..." class="w-full border-2 border-purple-200 rounded-2xl p-4 font-semibold text-purple-900 text-lg focus:border-purple-500 focus:ring-0 outline-none transition-colors resize-none shadow-inner"></textarea>
              </div>

              <!-- Media URL (if applicable) -->
              @if (selectedQuestion.type === 'image' || selectedQuestion.type === 'video' || selectedQuestion.type === 'audio') {
                <div class="bg-purple-50 p-4 rounded-2xl border-2 border-purple-100">
                  <label class="block text-purple-800 font-bold mb-2 flex items-center gap-2">
                    <mat-icon>{{ getIconForType(selectedQuestion.type) }}</mat-icon> קישור למדיה (URL)
                  </label>
                  <input type="text" [(ngModel)]="selectedQuestion.mediaUrl" placeholder="https://..." class="w-full border-2 border-purple-200 rounded-xl p-3 font-mono text-sm text-purple-900 focus:border-purple-500 outline-none">
                </div>
              }

              <!-- Answers -->
              <div>
                <div class="flex justify-between items-center mb-4">
                  <label class="text-purple-800 font-bold text-lg">אפשרויות תשובה</label>
                  <button (click)="addAnswer()" class="text-pink-500 hover:text-pink-700 font-bold flex items-center gap-1 bg-pink-50 px-3 py-1 rounded-lg transition-colors">
                    <mat-icon class="scale-75">add</mat-icon> הוסף תשובה
                  </button>
                </div>
                
                <div class="space-y-3" cdkDropList (cdkDropListDropped)="dropAnswer($event)">
                  @for (answer of selectedQuestion.answers; track $index; let i = $index) {
                    <div cdkDrag class="flex items-center gap-3 bg-white border-2 border-purple-100 p-3 rounded-2xl shadow-sm hover:border-purple-300 transition-colors">
                      <mat-icon cdkDragHandle class="text-purple-300 cursor-move">drag_indicator</mat-icon>
                      
                      @if (selectedQuestion.type !== 'poll') {
                        <button (click)="setCorrectAnswer(i)" 
                                class="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0"
                                [class.bg-green-500]="answer.isCorrect"
                                [class.border-green-500]="answer.isCorrect"
                                [class.text-white]="answer.isCorrect"
                                [class.bg-white]="!answer.isCorrect"
                                [class.border-gray-300]="!answer.isCorrect"
                                [class.text-transparent]="!answer.isCorrect">
                          <mat-icon class="scale-75">check</mat-icon>
                        </button>
                      }
                      
                      <input type="text" [(ngModel)]="answer.text" placeholder="תשובה {{ i + 1 }}..." class="flex-1 bg-transparent border-none focus:ring-0 font-semibold text-purple-900 outline-none">
                      
                      <button (click)="removeAnswer(i)" class="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- Settings -->
              <div class="flex gap-6 bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 mt-auto">
                <div class="flex-1">
                  <label class="block text-purple-800 font-bold mb-2 flex items-center gap-2">
                    <mat-icon>timer</mat-icon> טיימר (שניות)
                  </label>
                  <div class="flex items-center gap-2">
                    <button (click)="selectedQuestion.timerSeconds = Math.max(5, selectedQuestion.timerSeconds - 5)" class="bg-purple-200 hover:bg-purple-300 text-purple-800 p-2 rounded-lg font-bold w-10 h-10 flex items-center justify-center">-</button>
                    <input type="number" [(ngModel)]="selectedQuestion.timerSeconds" class="w-20 text-center border-2 border-purple-200 rounded-lg p-2 font-bold text-purple-900 outline-none focus:border-purple-500">
                    <button (click)="selectedQuestion.timerSeconds = selectedQuestion.timerSeconds + 5" class="bg-purple-200 hover:bg-purple-300 text-purple-800 p-2 rounded-lg font-bold w-10 h-10 flex items-center justify-center">+</button>
                  </div>
                </div>
                
                <div class="flex-1 flex items-center">
                  <label class="flex items-center gap-3 cursor-pointer group">
                    <div class="relative">
                      <input type="checkbox" [(ngModel)]="selectedQuestion.isDoubleBetEnabled" class="sr-only">
                      <div class="block bg-gray-300 w-14 h-8 rounded-full transition-colors group-hover:bg-gray-400" [class.bg-pink-500]="selectedQuestion.isDoubleBetEnabled"></div>
                      <div class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform" [class.translate-x-6]="selectedQuestion.isDoubleBetEnabled"></div>
                    </div>
                    <span class="text-purple-800 font-bold flex items-center gap-2">
                      <mat-icon class="text-pink-500">stars</mat-icon> אפשר הימור כפול
                    </span>
                  </label>
                </div>
              </div>
            </div>
          } @else {
            <div class="flex-1 flex flex-col items-center justify-center text-purple-300">
              <mat-icon class="text-8xl mb-6 opacity-50">edit_note</mat-icon>
              <h2 class="text-2xl font-bold text-purple-800 mb-2">בחר שאלה לעריכה</h2>
              <p>או לחץ על הפלוס כדי ליצור שאלה חדשה</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 1rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      background: white;
      border: 2px solid #d8b4fe; /* purple-300 */
      direction: rtl;
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
      background: #f3e8ff; /* purple-100 */
      border: 2px dashed #c084fc; /* purple-400 */
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class QuizEditorComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  user: User | null = null;
  quizId: string | null = null;
  quizName: string = 'חידון חדש';
  questions: Question[] = [];
  selectedQuestion: Question | null = null;
  Math = Math;

  questionTypes: {value: Question['type'], label: string, icon: string}[] = [
    { value: 'regular', label: 'רגילה', icon: 'text_fields' },
    { value: 'image', label: 'תמונה', icon: 'image' },
    { value: 'video', label: 'וידאו', icon: 'movie' },
    { value: 'audio', label: 'שמע', icon: 'audiotrack' },
    { value: 'poll', label: 'סקר', icon: 'poll' }
  ];

  ngOnInit() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        this.user = user;
        this.quizId = this.route.snapshot.paramMap.get('id');
        if (this.quizId) {
          await this.loadQuiz();
        } else {
          this.addNewQuestion();
        }
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  async loadQuiz() {
    if (!this.quizId) return;
    const db = getFirestore();
    const docRef = doc(db, 'quizzes', this.quizId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      this.quizName = data['quizName'];
      this.questions = data['questions'] || [];
      if (this.questions.length > 0) {
        this.selectedQuestion = this.questions[0];
      }
    }
  }

  addNewQuestion() {
    const newQ: Question = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      type: 'regular',
      content: '',
      answers: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      timerSeconds: 15,
      isDoubleBetEnabled: false
    };
    this.questions.push(newQ);
    this.selectedQuestion = newQ;
  }

  selectQuestion(q: Question) {
    this.selectedQuestion = q;
  }

  duplicateQuestion(q: Question) {
    const clone = JSON.parse(JSON.stringify(q));
    clone.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const index = this.questions.findIndex(x => x.id === q.id);
    this.questions.splice(index + 1, 0, clone);
    this.selectedQuestion = clone;
  }

  deleteQuestion(q: Question) {
    if (confirm('האם אתה בטוח שברצונך למחוק שאלה זו?')) {
      this.questions = this.questions.filter(x => x.id !== q.id);
      if (this.selectedQuestion?.id === q.id) {
        this.selectedQuestion = this.questions.length > 0 ? this.questions[0] : null;
      }
    }
  }

  drop(event: CdkDragDrop<Question[]>) {
    moveItemInArray(this.questions, event.previousIndex, event.currentIndex);
  }

  dropAnswer(event: CdkDragDrop<Answer[]>) {
    if (this.selectedQuestion) {
      moveItemInArray(this.selectedQuestion.answers, event.previousIndex, event.currentIndex);
    }
  }

  addAnswer() {
    if (this.selectedQuestion) {
      this.selectedQuestion.answers.push({ text: '', isCorrect: false });
    }
  }

  removeAnswer(index: number) {
    if (this.selectedQuestion) {
      this.selectedQuestion.answers.splice(index, 1);
    }
  }

  setCorrectAnswer(index: number) {
    if (this.selectedQuestion && this.selectedQuestion.type !== 'poll') {
      this.selectedQuestion.answers.forEach((a, i) => a.isCorrect = i === index);
    }
  }

  getIconForType(type: string): string {
    return this.questionTypes.find(t => t.value === type)?.icon || 'help';
  }

  getTypeName(type: string): string {
    return this.questionTypes.find(t => t.value === type)?.label || 'לא ידוע';
  }

  async saveQuiz() {
    if (!this.user) return;
    if (!this.quizName.trim()) {
      alert('אנא הזן שם לחידון');
      return;
    }

    const db = getFirestore();
    const quizData = {
      userId: this.user.uid,
      quizName: this.quizName,
      questions: this.questions,
      updatedAt: new Date().toISOString(),
      defaultTimerSeconds: 15,
      defaultScoreMethod: 'regular',
      baseRegularScore: 1,
      minPercentageScore: 1,
      maxPercentageScore: 10
    };

    try {
      if (this.quizId) {
        await updateDoc(doc(db, 'quizzes', this.quizId), quizData);
      } else {
        const newQuizRef = doc(collection(db, 'quizzes'));
        this.quizId = newQuizRef.id;
        await setDoc(newQuizRef, { ...quizData, quizId: this.quizId, createdAt: new Date().toISOString() });
      }
      alert('החידון נשמר בהצלחה!');
    } catch (error) {
      console.error('Error saving quiz', error);
      alert('שגיאה בשמירת החידון');
    }
  }

  clearQuiz() {
    if (confirm('האם אתה בטוח שברצונך למחוק את כל השאלות מהחידון?')) {
      this.questions = [];
      this.selectedQuestion = null;
    }
  }

  importExcel() {
    document.getElementById('excelUpload')?.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Skip header row if exists, assuming first row is data if no clear headers, 
        // but let's just parse all rows that have content in col 0
        const newQuestions: Question[] = [];
        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          if (!row || !row[0]) continue; // Skip empty rows

          const content = String(row[0] || '');
          const ans1 = String(row[1] || '');
          const ans2 = String(row[2] || '');
          const ans3 = String(row[3] || '');
          const ans4 = String(row[4] || '');
          const correctIndexStr = String(row[5] || '').trim();
          const timerStr = String(row[6] || '').trim();

          const answers: Answer[] = [];
          if (ans1) answers.push({ text: ans1, isCorrect: false });
          if (ans2) answers.push({ text: ans2, isCorrect: false });
          if (ans3) answers.push({ text: ans3, isCorrect: false });
          if (ans4) answers.push({ text: ans4, isCorrect: false });

          let type: Question['type'] = 'regular';
          if (correctIndexStr === '') {
            type = 'poll';
          } else {
            const correctIdx = parseInt(correctIndexStr) - 1;
            if (!isNaN(correctIdx) && correctIdx >= 0 && correctIdx < answers.length) {
              answers[correctIdx].isCorrect = true;
            } else if (answers.length > 0) {
              answers[0].isCorrect = true; // fallback
            }
          }

          let timerSeconds = parseInt(timerStr);
          if (isNaN(timerSeconds) || timerSeconds <= 0) timerSeconds = 15;

          newQuestions.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5) + i,
            type,
            content,
            answers,
            timerSeconds,
            isDoubleBetEnabled: false
          });
        }

        if (newQuestions.length > 0) {
          if (confirm(`נמצאו ${newQuestions.length} שאלות. האם לייבא אותן?`)) {
            this.questions.push(...newQuestions);
            if (!this.selectedQuestion) this.selectedQuestion = this.questions[0];
          }
        } else {
          alert('לא נמצאו שאלות תקינות בקובץ.');
        }
      } catch (err) {
        console.error('Error parsing Excel', err);
        alert('שגיאה בקריאת הקובץ. אנא ודא שהפורמט תקין.');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset input
  }
}
