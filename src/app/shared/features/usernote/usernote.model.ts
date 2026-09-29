export interface IUserNote
{
    userId?: string;
    noteId?: string;
    noteTitle?: string;
    noteContent?: string;
    isPinned?: number;
    isReminder?: number;
    reminderDate?: string | null | undefined;
    isChecklist?: number;
    noteColor?: string;
}