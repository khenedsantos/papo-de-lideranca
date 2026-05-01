import { Transform } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';

export const BOOK_NOTE_PROMPT_KEYS = [
  'main_idea',
  'practical_application',
  'leadership_situation',
] as const;

export type BookNotePromptKey = (typeof BOOK_NOTE_PROMPT_KEYS)[number];

export class CreateBookNoteDto {
  @IsIn(BOOK_NOTE_PROMPT_KEYS)
  promptKey!: BookNotePromptKey;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(20, 500)
  content!: string;
}
