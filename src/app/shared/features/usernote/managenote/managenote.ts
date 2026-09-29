import { Component, EventEmitter, inject, Input, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { ExpansionPanelHeader } from '../../../common-components/expansion-panel-header/expansion-panel-header';
import { CommonQuillEditorComponent } from '../../../common-components/common-quill-editor/common-quill-editor';
import { GenericButton } from '../../../common-components/generic-component-type/generic-button/generic-button';
import { GenericSwitch } from '../../../common-components/generic-component-type/generic-switch/generic-switch';
import { InputDate } from '../../../common-components/input-types/input-date/input-date';
import { InputSelectOptionField } from '../../../common-components/input-types/input-select-option-field/input-select-option-field';
import { InputTextArea } from '../../../common-components/input-types/input-text-area/input-text-area';
import { InputTime } from '../../../common-components/input-types/input-time/input-time';
import { IUserNote } from '../usernote.model';
import { UserNoteService } from '../usernote.service';
import { UserService } from '../../../../core/user/user.service';
import { User } from '../../../../core/user/user.types';
export interface Option {
  key: string;
  value: string;
}
@Component({
  selector: 'app-managenote',
  imports: [CommonModule, ReactiveFormsModule,
    InputTextArea,
    GenericSwitch,
    InputDate,
    InputTime,
    GenericButton,
    MatTooltipModule, MatSelectModule, CommonQuillEditorComponent],
  templateUrl: './managenote.html',
  styleUrl: './managenote.scss'
})
export class Managenote implements OnInit {
  frmUserNote: FormGroup;
  userNote: IUserNote = {};
  businessHeaderPanel: WritableSignal<boolean> = signal(true);
  @Output() modalResult = new EventEmitter<any>();
  @Input() modalParent?: { close(result?: any): void; closeModal(): void };
  @Input() initialData?: any;
  toastr = inject(ToastrService);
  private userSubscription?: Subscription;
  public _noteColorOption = signal<{ key: string; value: string }[]>([]);
  userNoteId: number = 0;
  saveButtonText: string = "Create";
  reminderTime: string;
  currentUser?: User;
  selectedColor?: string = "";
  noteColors = [
    { name: 'Aqua Green', code: '#1CE8B5' },
    { name: 'Bright Cyan', code: '#00FFFF' },
    { name: 'Candy Pink', code: '#FF69B4' },
    { name: 'Cerulean', code: '#007BA7' },
    { name: 'Coral Orange', code: '#FF6C40' },
    { name: 'Deep Pink', code: '#FF1493' },
    { name: 'Electric Purple', code: '#BF00FF' },
    { name: 'Golden Yellow', code: '#FFD900' },
    { name: 'Lavender', code: '#E1BEE7' },
    { name: 'Lavender Pink', code: '#FBAED2' },
    { name: 'Lemon', code: '#FFF700' },
    { name: 'Light Green', code: '#C8E6C9' },
    { name: 'Light Orange', code: '#FFCC80' },
    { name: 'Light Yellow', code: '#FFF59D' },
    { name: 'Lime Green', code: '#95D640' },
    { name: 'Magenta', code: '#FF00FF' },
    { name: 'Mint Green', code: '#98FF98' },
    { name: 'Neon Green', code: '#39FF14' },
    { name: 'Pastel Orange', code: '#FFB347' },
    { name: 'Peach', code: '#FFAB91' },
    { name: 'Peacock Blue', code: '#1CA9C9' },
    { name: 'Pink Rose', code: '#F8BBD0' },
    { name: 'Sky Blue', code: '#40C2FF' },
    { name: 'Sky Magenta', code: '#D580FF' },
    { name: 'Soft Blue', code: '#BBDEFB' },
    { name: 'Soft Coral', code: '#FF7F50' },
    { name: 'Soft Gold', code: '#FFE082' },
    { name: 'Sunset Orange', code: '#FF4500' },
    { name: 'Turquoise', code: '#40E0D0' },
    { name: 'Vibrant Orange', code: '#FF9900' }
  ];
  constructor(private formBuilder: FormBuilder,
    private userNoteService: UserNoteService,
    private userService: UserService
  ) { }
  ngOnInit() {
    this.frmUserNote = this.formBuilder.group({
      title: ['', [Validators.required, Validators.maxLength(250)]],
      content: ['', [Validators.required]],
      isPinned: [false],
      isReminder: [false],
      reminderDate: [''],
      reminderTime: [''],
      noteColor: ['']
    });
    this.userSubscription = this.userService.user$.subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (error) => {
        console.error('Failed to load current user profile from stream', error);
      },
    });
    this.loadNoteColor();
    if (this.initialData) {
      this.getNoteDetails(this.initialData);
    }
  }
  loadNoteColor() {
    const colors = this.noteColors;
    if (colors && colors.length > 0) {
      const options: Option[] = colors.map(color => ({
        key: color.code,
        value: color.name
      }));
      this._noteColorOption.set(options);
    }
    else {
      this._noteColorOption.set([]);
    }
  }
  // Create/Update Note
  createNote() {
    this.userNote.noteId = String(this.userNoteId);
    this.userNote.userId = this.currentUser?.username;
    this.userNote.noteTitle = this.form['title'].value;
    this.userNote.noteContent = this.form['content'].value;
    this.userNote.isPinned = this.form['isPinned'].value ? 1 : 0;
    this.userNote.isReminder = this.form['isReminder'].value ? 1 : 0;
    if (this.userNote.isReminder == 1) {
      this.userNote.reminderDate = this.convertToIsoDateTime(this.form['reminderDate'].value, this.form['reminderTime'].value)
    }
    else
      this.userNote.reminderDate = null;
    this.userNote.isChecklist = 0;
    this.userNote.noteColor = this.form['noteColor'].value;
    if (this.frmUserNote.valid) {
      this.userNoteService
        .manageUserNote(this.userNote)
        .subscribe((Response) => {
          if (this.userNoteId > 0) {
            this.modalResult.emit({ title: 'Update Note', message: "Note Updated Successfully" });
            //this.toastr.success('Note Updated Successfully', 'Update Note');
          }
          else {
            this.modalResult.emit({ title: 'Create Note', message: "Note Created Successfully" });
            //this.toastr.success('Note Created Successfully', 'Create Note');
          }
          this.onReset();
          setTimeout(() => {
            if (this.modalParent) {
              this.modalParent.close(Response);
            }
          }, 1500);
          // if (Response.Status == 'OK') {
          //   this.loading = false;
          //   this.sharedService.SuccessOrErrorPopupService.showSuccessOrErrorPopup('Success', Response.Message, 'Close', false);
          //   this.onReset();
          // } else {
          //   this.loading = false;
          //   this.sharedService.SuccessOrErrorPopupService.showSuccessOrErrorPopup('Failure', Response.Message, 'Try again');
          //   // this.popupError = true;
          //   // this.header = 'Failure';
          //   // this.message = Response.Message;
          //   // this.btnText = 'Close';
          //   // this.popup = true;
          // }
          // this.loading = false;
        });
    }
  }
  getNoteDetails(note: IUserNote) {
    this.userNoteId = Number(note.noteId);
    this.form['title'].setValue(note.noteTitle);
    this.form['content'].setValue(note.noteContent);
    this.form['isPinned'].setValue(note.isPinned);
    this.form['isReminder'].setValue(note.isReminder);
    if (note.isReminder == 1) {
      const { date, time } = this.splitFromIsoDateTime(note.reminderDate ?? '');
      this.form['reminderDate'].setValue(date);
      this.form['reminderTime'].setValue(time);
    }
    this.form['noteColor'].setValue(note.noteColor?.toUpperCase());
    //this.selectedColor = note.noteColor;
    this.saveButtonText = "Update";
  }
  onReset() {
    this.frmUserNote.reset();
    this.form['title'].setValue('');
    this.form['content'].setValue('');
    this.form['isPinned'].setValue('');
    this.form['isReminder'].setValue('');
    this.form['reminderDate'].setValue('');
    this.userNoteId = 0;
    this.saveButtonText = "Create";
  }
  get form() {
    return this.frmUserNote.controls;
  }
  splitFromIsoDateTime(isoDateTime: string): { date: string; time: string } {
    if (!isoDateTime) return { date: '', time: '' };
    const [datePart, timePart] = isoDateTime.split('T'); // split at 'T'
    if (!datePart || !timePart) return { date: '', time: '' };
    // Optional: remove seconds from time
    const [hours, minutes] = timePart.split(':');
    const time = `${hours}:${minutes}`;
    return { date: datePart, time };
  }
  convertToIsoDateTime(dateStr: string, timeStr: string): string {
    const [year, month, day] = dateStr.split('-');
    const [hour, minute] = timeStr.split(':');
    return `${year}-${month}-${day}T${hour}:${minute}:00`;
  }
  // handleColorSelection(event: { selectedOption: any; selectedKey: string; selectedValue: string }): void {
  //   this.selectedColor = event.selectedKey;
  //   console.log(event.selectedValue, event.selectedKey)
  // }
}
