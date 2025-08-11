import type { ChatInfo } from '../../src/telegram/types.js';

export class ChatBuilder {
  private chat: Partial<ChatInfo> = {};

  withId(id: string): this {
    this.chat.id = id;
    return this;
  }

  withTitle(title: string): this {
    this.chat.title = title;
    return this;
  }

  withType(type: ChatInfo['type']): this {
    this.chat.type = type;
    return this;
  }

  withUsername(username: string): this {
    this.chat.username = username;
    return this;
  }

  withMemberCount(count: number): this {
    this.chat.memberCount = count;
    return this;
  }

  withDescription(description: string): this {
    this.chat.description = description;
    return this;
  }

  asVerified(): this {
    this.chat.isVerified = true;
    return this;
  }

  asScam(): this {
    this.chat.isScam = true;
    return this;
  }

  asFake(): this {
    this.chat.isFake = true;
    return this;
  }

  build(): ChatInfo {
    return {
      id: '123',
      title: 'Test Chat',
      type: 'private',
      ...this.chat
    };
  }
}
