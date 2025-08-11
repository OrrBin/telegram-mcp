import type { MessageInfo } from '../../src/telegram/types.js';

export class MessageBuilder {
  private message: Partial<MessageInfo> = {};

  withId(id: number): this {
    this.message.id = id;
    return this;
  }

  withText(text: string): this {
    this.message.text = text;
    return this;
  }

  withChatId(chatId: string): this {
    this.message.chatId = chatId;
    return this;
  }

  withSender(senderId: string, senderName?: string): this {
    this.message.senderId = senderId;
    if (senderName) {
      this.message.senderName = senderName;
    }
    return this;
  }

  withDate(date: number): this {
    this.message.date = date;
    return this;
  }

  asOutgoing(): this {
    this.message.isOutgoing = true;
    return this;
  }

  asIncoming(): this {
    this.message.isOutgoing = false;
    return this;
  }

  withReplyTo(messageId: number): this {
    this.message.replyToMessageId = messageId;
    return this;
  }

  withMedia(type: MessageInfo['mediaType'], caption?: string): this {
    this.message.mediaType = type;
    if (caption) {
      this.message.mediaCaption = caption;
    }
    return this;
  }

  build(): MessageInfo {
    return {
      id: 1,
      chatId: '123',
      date: Date.now(),
      isOutgoing: false,
      ...this.message
    };
  }
}
