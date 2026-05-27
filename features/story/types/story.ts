export interface Story {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string;
  expiresAt: string;
  viewedBy: {
    userId: string;
    viewedAt: string;
    user?: {
      username: string;
      avatar?: string;
    };
  }[];
}

export interface StoryUser {
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  stories: Story[];
}
