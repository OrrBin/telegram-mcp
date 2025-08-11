export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  phone: string;
  sessionDir: string;
}

export interface ChatInfo {
  id: string;
  title: string;
  type: 'private' | 'group' | 'supergroup' | 'channel' | 'secret';
  username?: string;
  memberCount?: number;
  description?: string;
  isVerified?: boolean;
  isScam?: boolean;
  isFake?: boolean;
}

export interface MessageInfo {
  id: number;
  chatId: string;
  senderId?: string;
  senderName?: string;
  text?: string;
  date: number;
  isOutgoing: boolean;
  replyToMessageId?: number;
  replyToMessage?: MessageInfo;
  mediaType?: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'sticker' | 'animation';
  mediaCaption?: string;
  forwardedFrom?: ForwardInfo;
  mediaInfo?: MediaInfo;
  editDate?: number;
  isEdited?: boolean;
  canBeEdited?: boolean;
  canBeDeleted?: boolean;
  messageThread?: MessageThread;
}

export interface ForwardInfo {
  fromChatId?: string;
  fromChatTitle?: string;
  fromMessageId?: number;
  senderName?: string;
  date?: number;
  isChannelPost?: boolean;
}

export interface MessageThread {
  messageThreadId: number;
  messages: MessageInfo[];
}

export interface MessageContext {
  message: MessageInfo;
  replyChain: MessageInfo[];
  thread?: MessageInfo[];
  forwardHistory?: ForwardInfo[];
}

export interface MediaInfo {
  fileId: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailPath?: string;
  localPath?: string;
}

export interface MediaDownloadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
}

export interface UserInfo {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  isBot: boolean;
  isVerified?: boolean;
  isScam?: boolean;
  isFake?: boolean;
  status?: string;
}

export interface FileInfo {
  id: string;
  size: number;
  expectedSize: number;
  localPath?: string;
  remotePath?: string;
  canBeDownloaded: boolean;
  isDownloadingActive: boolean;
  isDownloadingCompleted: boolean;
  downloadedPrefixSize: number;
  downloadedSize: number;
}

export interface DocumentInfo {
  fileName: string;
  mimeType?: string;
  thumbnail?: MediaInfo;
  file: FileInfo;
}

export interface SearchResult {
  messages: MessageInfo[];
  totalCount: number;
  nextOffset?: string;
}
