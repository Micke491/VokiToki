export interface UserProfile {
  _id: string;
  username: string;
  name?: string;
  bio?: string;
  avatar?: string;
  links: { label: string; url: string }[];
  location?: string;
  createdAt: string;
  activeStoriesCount: number;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isRequested?: boolean;
  isFollower?: boolean;
}
