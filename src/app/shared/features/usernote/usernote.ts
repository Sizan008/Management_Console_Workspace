import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { Managenote } from '../usernote/managenote/managenote'
import { DomSanitizer } from '@angular/platform-browser';
import { IUserNote } from './usernote.model';
import { UserNoteService } from './usernote.service';
import { UserService } from '../../../core/user/user.service';
import { User } from '../../../core/user/user.types';

type NoteFilter = 'all' | 'pinned' | 'reminder';
type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-usernote',
  imports: [CommonModule, MatIcon, MatTooltipModule, CdkDropList, CdkDrag, Managenote],
  templateUrl: './usernote.html',
  styleUrl: './usernote.scss'
})
export class Usernote implements OnInit {
  private userSubscription?: Subscription;

  /** Full note list (source of truth); search / filter derive from this. */
  readonly allNotes = signal<IUserNoteUI[]>([]);

  /** Free-text search across title + content. */
  readonly searchTerm = signal('');

  /** Active quick filter. */
  readonly filterMode = signal<NoteFilter>('all');

  /** Grid (masonry-style cards) vs. list (full-width rows) layout. */
  readonly viewMode = signal<ViewMode>('grid');

  toastr = inject(ToastrService);

  /** Right-drawer (Add / Update note) state. */
  showModal = false;
  drawerClosing = false;
  editNote: IUserNote | null = null;

  /** Small API handed to the hosted Managenote so it can close the drawer. */
  readonly drawerApi = {
    close: (_result?: any) => this.closeDrawer(),
    closeModal: () => this.closeDrawer(),
  };

  currentUser?: User;

  /** Notes matching the current search + filter. */
  readonly filteredNotes = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const mode = this.filterMode();

    return this.allNotes().filter((note) => {
      if (mode === 'pinned' && !note.isPinned) return false;
      if (mode === 'reminder' && !note.isReminder) return false;

      if (term) {
        const haystack = (
          (note.noteTitle ?? '') + ' ' + this.stripHtml(note.noteContent ?? '')
        ).toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  });

  readonly pinnedNotes = computed(() => this.filteredNotes().filter((n) => n.isPinned));
  readonly otherNotes = computed(() => this.filteredNotes().filter((n) => !n.isPinned));

  /** True when the user has no notes at all (vs. a search that returned nothing). */
  readonly hasNoNotes = computed(() => this.allNotes().length === 0);
  readonly hasNoMatches = computed(() => this.allNotes().length > 0 && this.filteredNotes().length === 0);
  readonly isFiltering = computed(() => this.searchTerm().trim().length > 0 || this.filterMode() !== 'all');

  constructor(
    private userNoteService: UserNoteService,
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.userSubscription = this.userService.user$.subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (error) => {
        console.error('Failed to load current user profile from stream', error);
      },
    });

    this.getUserNoteByUserId();
  }

  getUserNoteByUserId() {
    const userId = this.currentUser?.username;
    this.userNoteService
      .getUserNoteByUserId(userId ?? '')
      .subscribe((Response) => {
        this.allNotes.set(
          (Response as IUserNote[]).map((note) => ({ ...note, expanded: false }))
        );
      });
  }

  setFilter(mode: NoteFilter) {
    this.filterMode.set(mode);
  }

  setView(mode: ViewMode) {
    this.viewMode.set(mode);
  }

  /**
   * Reminder urgency used to colour the reminder chip:
   *  - 'overdue' (red)  — due date has passed
   *  - 'soon'    (amber) — due within the next 24h
   *  - 'future'  (blue)  — further out
   * Returns null when the note has no active reminder.
   */
  reminderStatus(note: IUserNote): 'overdue' | 'soon' | 'future' | null {
    if (!note.isReminder || !note.reminderDate) return null;
    const due = new Date(note.reminderDate).getTime();
    if (isNaN(due)) return null;
    const now = Date.now();
    if (due < now) return 'overdue';
    if (due - now <= 24 * 60 * 60 * 1000) return 'soon';
    return 'future';
  }

  /**
   * Checklist completion derived from the note's rich-text content
   * (Quill stores items as `data-list="checked|unchecked"`).
   * Returns null when the note has no checklist items.
   */
  checklistProgress(note: IUserNote): { done: number; total: number } | null {
    const html = note.noteContent ?? '';
    const done = (html.match(/data-list=["']checked["']/g) || []).length;
    const open = (html.match(/data-list=["']unchecked["']/g) || []).length;
    const total = done + open;
    return total > 0 ? { done, total } : null;
  }

  onSearchInput(value: string) {
    this.searchTerm.set(value);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.filterMode.set('all');
  }

  deleteNote(noteId: string) {
    this.userNoteService
      .deleteUserNote(noteId)
      .subscribe(() => {
        this.toastr.success('Note Deleted Successfully', 'Delete Note');
        this.getUserNoteByUserId();
      });
  }

  onDeleteNote(noteId: string) {
    const confirmed = confirm(`Are you sure you want to delete this note?`);
    if (confirmed) {
      this.deleteNote(noteId);
    }
  }

  onArchiveNote(note: IUserNote) {
    // No archive endpoint exists yet — surface the intent without pretending it persisted.
    this.toastr.info('Archiving will be available soon.', 'Archive');
  }

  /** Reorder within the pinned section (client-side; resets on next server fetch). */
  dropPinned(event: CdkDragDrop<IUserNoteUI[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const pinned = [...this.pinnedNotes()];
    moveItemInArray(pinned, event.previousIndex, event.currentIndex);
    this.allNotes.set([...pinned, ...this.otherNotes()]);
  }

  /** Reorder within the "others" section (client-side; resets on next server fetch). */
  dropOther(event: CdkDragDrop<IUserNoteUI[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const others = [...this.otherNotes()];
    moveItemInArray(others, event.previousIndex, event.currentIndex);
    this.allNotes.set([...this.pinnedNotes(), ...others]);
  }

  updateNotePinStatus(note: IUserNote) {
    note.isPinned = +!note.isPinned;

    this.userNoteService
      .manageUserNote(note)
      .subscribe(() => {
        if (note.isPinned == 0) {
          this.toastr.success('Note Unpinned Successfully', 'Unpin Note');
        }
        else {
          this.toastr.success('Note Pinned Successfully', 'Pin Note');
        }
      });

    setTimeout(() => {
      this.getUserNoteByUserId();
    }, 500);
  }

  toggleExpand(note: IUserNoteUI) {
    note.expanded = !note.expanded;
  }

  /** Open the drawer for a new note. */
  openModal() {
    this.editNote = null;
    this.drawerClosing = false;
    this.showModal = true;
  }

  /** Open the drawer pre-filled to edit an existing note. */
  onUpdateNote(note: IUserNote) {
    this.editNote = note;
    this.drawerClosing = false;
    this.showModal = true;
  }

  onDrawerBackdrop() {
    this.closeDrawer();
  }

  @HostListener('document:keydown.escape')
  closeDrawer() {
    if (!this.showModal || this.drawerClosing) return;
    // Play the slide-out animation, then unmount.
    this.drawerClosing = true;
    setTimeout(() => {
      this.showModal = false;
      this.drawerClosing = false;
      this.editNote = null;
    }, 240);
  }

  /** Managenote emitted a save result — toast, refresh, and close the drawer. */
  onModalResult(result: any) {
    if (!result) return;
    this.toastr.success(result.message, result.title);
    this.getUserNoteByUserId();
    this.closeDrawer();
  }

  getSafeHtml(html: string | undefined) {
    return html
      ? this.sanitizer.bypassSecurityTrustHtml(html)
      : '';
  }

  /** Plain-text projection of note HTML, used for search matching. */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ');
  }
}

interface IUserNoteUI extends IUserNote {
  expanded: boolean;
}
