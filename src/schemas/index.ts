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

export const GetMediaContentSchema = z.object({
  messageId: z.number(),
  chatId: z.string().min(1),
  downloadPath: z.string().optional()
});

export const SendMediaSchema = z.object({
  chatId: z.string().min(1),
  filePath: z.string().min(1),
  caption: z.string().optional(),
  replyToMessageId: z.number().optional()
});

export const GetMediaInfoSchema = z.object({
  messageId: z.number(),
  chatId: z.string().min(1)
});

export const EditMessageSchema = z.object({
  messageId: z.number(),
  chatId: z.string().min(1),
  newText: z.string().min(1)
});

export const DeleteMessageSchema = z.object({
  messageId: z.number(),
  chatId: z.string().min(1)
});

export const ForwardMessageSchema = z.object({
  fromChatId: z.string().min(1),
  messageId: z.number(),
  toChatId: z.string().min(1)
});

export const GetMessageContextSchema = z.object({
  messageId: z.number(),
  chatId: z.string().min(1),
  includeReplies: z.boolean().default(true),
  includeThread: z.boolean().default(false)
});

export const SendDocumentSchema = z.object({
  chatId: z.string().min(1),
  filePath: z.string().min(1),
  caption: z.string().optional(),
  replyToMessageId: z.number().optional()
});

export const DownloadFileSchema = z.object({
  messageId: z.number(),
  chatId: z.string().min(1),
  outputPath: z.string().optional()
});

export const GetFileInfoSchema = z.object({
  messageId: z.number(),
  chatId: z.string().min(1)
});

export type ListChatsInput = z.infer<typeof ListChatsSchema>;
export type GetChatInfoInput = z.infer<typeof GetChatInfoSchema>;
export type SearchChatsInput = z.infer<typeof SearchChatsSchema>;
export type GetMessagesInput = z.infer<typeof GetMessagesSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type SearchMessagesInput = z.infer<typeof SearchMessagesSchema>;
export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>;
export type GetUserInfoInput = z.infer<typeof GetUserInfoSchema>;
export type GetMediaContentInput = z.infer<typeof GetMediaContentSchema>;
export type SendMediaInput = z.infer<typeof SendMediaSchema>;
export type GetMediaInfoInput = z.infer<typeof GetMediaInfoSchema>;
export type EditMessageInput = z.infer<typeof EditMessageSchema>;
export type DeleteMessageInput = z.infer<typeof DeleteMessageSchema>;
export type ForwardMessageInput = z.infer<typeof ForwardMessageSchema>;
export type GetMessageContextInput = z.infer<typeof GetMessageContextSchema>;
export type SendDocumentInput = z.infer<typeof SendDocumentSchema>;
export type DownloadFileInput = z.infer<typeof DownloadFileSchema>;
export type GetFileInfoInput = z.infer<typeof GetFileInfoSchema>;
