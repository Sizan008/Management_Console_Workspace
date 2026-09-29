// common-quill-editor.component.ts
import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuillModule } from 'ngx-quill';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  QUILL_MIN_EDITOR,
  QUILL_MAX_EDITOR,
  QUILL_EDITOR_FOR_SPECS,
  MEDIUM_EDITOR_CONFIG,
  MIN_EDITOR_CONFIG,
} from '../../constant/quill-editor.constant';

// ⬇️ NEW: Quill + TableUp + PageBreak
import Quill from 'quill';

// table-up styles
import 'quill-table-up/index.css';
import 'quill-table-up/table-creator.css';

import TableUp, {
  defaultCustomSelect,
  TableAlign,
  TableMenuContextmenu,
  TableResizeScale,
  TableSelection,
} from 'quill-table-up';

Quill.register({ [`modules/${TableUp.moduleName}`]: TableUp }, true);

const BlockEmbed: any = Quill.import('blots/block/embed');

class PageBreakBlot extends BlockEmbed {
  static blotName = 'pageBreak';
  static tagName = 'div';
  static className = 'ql-page-break';

  static create() {
    const node = super.create();
    node.setAttribute('contenteditable', 'false');
    return node;
  }

  static value() {
    return true;
  }
}

Quill.register('formats/pageBreak', PageBreakBlot);

type EditorConfigType = 'min' | 'max' | 'spec' | 'medium' | 'minCk';

@Component({
  selector: 'common-quill-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, QuillModule, MatFormFieldModule, MatInputModule],
  templateUrl: './common-quill-editor.html',
  styleUrls: ['./common-quill-editor.scss'],
})
export class CommonQuillEditorComponent {
  @Input({ required: true }) formGroup!: FormGroup;
  @Input({ required: true }) controlName!: string;

  @Input() labelName = '';
  @Input() classProperty = '';
  @Input() labelClass = '';
  @Input() isRequired = false;

  @Input() configType: EditorConfigType = 'min';

  /** optional override for custom modules */
  @Input() customModules: any;

  /** re-emit ngx-quill’s event to parent (TemplateConfiguration) */
  @Output() onEditorCreated = new EventEmitter<any>();

  private editor!: Quill;

  /** resolved module passed to quill-editor */
  get modules(): any {
    if (this.customModules) return this.customModules;

    switch (this.configType) {
      case 'max':
        return QUILL_MAX_EDITOR;
      case 'spec':
        return QUILL_EDITOR_FOR_SPECS;
      case 'medium':
        return MEDIUM_EDITOR_CONFIG;
      case 'minCk':
        return MIN_EDITOR_CONFIG;
      case 'min':
      default:
        return QUILL_MIN_EDITOR;
    }
  }

  /** called by template when ngx-quill fires onEditorCreated */
  handleEditorCreated(editor: Quill) {
    this.editor = editor;

    // wire pageBreak button
    const toolbar: any = editor.getModule('toolbar');
    if (toolbar && typeof toolbar.addHandler === 'function') {
      toolbar.addHandler('pageBreak', () => this.insertPageBreak());
    }

    // notify parent (TemplateConfigurationComponent)
    this.onEditorCreated.emit(editor);
  }

  private insertPageBreak() {
    const range = this.editor.getSelection(true);
    if (!range) return;
    this.editor.insertEmbed(range.index, 'pageBreak', true, 'user');
    this.editor.setSelection(range.index + 1, 0);
  }
}
