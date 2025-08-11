import { z } from 'zod';

export const ListChatsSchema = z.object({
  limit: z.number().min(1).max(200).default(50).optional()
});

export const GetChatInfoSchema = z.object({
  chatId: z.string().min(1)
});

export const SearchChatsSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(100).default(20).optional()
});

export const GetMessagesSchema = z.object({
  chatId: z.string().min(1),
  limit: z.number().min(1).max(100).default(20).optional(),
  fromMessageId: z.number().optional()
});

export const SendMessageSchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1),
  replyToMessageId: z.number().optional()
});

export const SearchMessagesSchema = z.object({
  query: z.string().min(1),
  chatId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20).optional()
});

export const MarkAsReadSchema = z.object({
  chatId: z.string().min(1),
  messageIds: z.array(z.number()).min(1)
});

export const GetUserInfoSchema = z.object({
  userId: z.string().min(1)
});

export type ListChatsInput = z.infer<typeof ListChatsSchema>;
export type GetChatInfoInput = z.infer<typeof GetChatInfoSchema>;
export type SearchChatsInput = z.infer<typeof SearchChatsSchema>;
export type GetMessagesInput = z.infer<typeof GetMessagesSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type SearchMessagesInput = z.infer<typeof SearchMessagesSchema>;
export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>;
export type GetUserInfoInput = z.infer<typeof GetUserInfoSchema>;
