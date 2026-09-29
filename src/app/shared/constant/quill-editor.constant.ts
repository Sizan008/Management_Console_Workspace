import TableUp, {
  defaultCustomSelect,
  TableMenuContextmenu,
  TableResizeScale,
  TableSelection,
} from 'quill-table-up';

export const QUILL_MIN_EDITOR = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }, { list: 'ordered' }, { list: 'bullet' }],
    [{ script: 'sub' }, { script: 'super' }],
    ['line-height'],
  ],
};

export const QUILL_EDITOR_FOR_SPECS = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ color: [] }, { background: [] }],
    [{ align: [] }, { list: 'ordered' }, { list: 'bullet' }],
    [{ script: 'sub' }, { script: 'super' }],
  ],
};

export const MEDIUM_EDITOR_CONFIG = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ script: 'sub' }, { script: 'super' }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ['blockquote', 'code-block'],
    [{ color: [] }, { background: [] }],
    [{ font: [] }, { size: ['small', false, 'large', 'huge'] }],
    [{ direction: 'rtl' }],
    ['link', 'image', 'video'],
    ['clean'],
  ],
};

export const MIN_EDITOR_CONFIG = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ font: [] }, { size: [] }, { color: [] }],
    ['link', 'image'],
    ['clean'],
  ],
};

// 🔥 FULL editor = old Angular19 quillModules + your extra buttons
export const QUILL_MAX_EDITOR: any = {
  toolbar: {
    container: [
      // text styles
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],

      // headers / lists / indent
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ direction: 'rtl' }],

      // sizes / headers
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],

      // colors / fonts / align
      [{ color: [] }, { background: [] }],
      [{ font: [] }],
      [{ align: [] }],

      // clean + any custom buttons you already had
      ['clean'],
      ['specialChar'],

      // media
      ['link', 'image', 'video'],

      // ⬇️ NEW: TableUp toolbar button (same as Angular 19)
      [{ [TableUp.toolName]: [] }],

      // ⬇️ NEW: Page break button (handled in component onEditorCreated)
      ['pageBreak'],
    ],
  },

  // ⬇️ NEW: TableUp module options (same as Angular 19)
  [TableUp.moduleName]: {
    full: false,
    fullSwitch: false,
    customSelect: defaultCustomSelect,
    customBtn: false,
    modules: [
      { module: TableResizeScale, options: { blockSize: 0, offset: 0 } },
      { module: TableSelection, options: { selectColor: 'transparent' } },
      { module: TableMenuContextmenu },
    ],
  },
};
