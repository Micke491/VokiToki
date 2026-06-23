'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { wsClient } from '@/lib/ws-client';
import { Story, StoryUser } from '@/features/story/types/story';

export function useStories(currentUser: { _id: string, username: string, avatar?: string } | null) {
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/stories`);

      if (response.ok) {
        const data = await response.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markStoryAsViewed = useCallback(async (userId: string, storyId: string) => {
    if (!currentUser) return;
    
    try {
      const response = await apiFetch(`/api/stories/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ storyId }),
      });

      if (response.ok) {
        setStories(prev => prev.map(storyUser => ({
          ...storyUser,
          stories: storyUser.stories.map(s => 
            s._id === storyId ? { 
              ...s, 
              viewedBy: [
                ...(s.viewedBy || []).filter(v => v.userId !== currentUser._id), 
                { 
                  userId: currentUser._id, 
                  viewedAt: new Date().toISOString(),
                  user: {
                    username: currentUser.username,
                    avatar: currentUser.avatar
                  }
                }
              ] 
            } : s
          )
        })));
      }
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchStories();

    if (!currentUser?._id || !wsClient) return;

    const channel = wsClient.subscribe(`user-${currentUser._id}`);

    channel.bind('story-viewed', (data: { storyId: string, viewedBy: string, viewedAt?: string, user?: { username: string, avatar?: string } }) => {
      setStories(prev => prev.map(storyUser => ({
        ...storyUser,
        stories: storyUser.stories.map(s => {
          if (s._id === data.storyId) {
            const viewedBy = s.viewedBy || [];
            const exists = viewedBy.some(v => v.userId === data.viewedBy);
            
            const newViewerEntry = { 
              userId: data.viewedBy, 
              viewedAt: data.viewedAt || new Date().toISOString(),
              user: data.user 
            };
 
            if (exists) {
              return {
                ...s,
                viewedBy: viewedBy.map(v => 
                  v.userId === data.viewedBy ? { ...v, ...newViewerEntry, user: data.user || v.user } : v
                )
              };
            }
            return {
              ...s,
              viewedBy: [...viewedBy, newViewerEntry]
            };
          }
          return s;
        })
      })));
    });

    channel.bind('story-new', () => {
      fetchStories();
    });

    channel.bind('story-deleted', (data: { storyId: string, userId: string }) => {
      setStories(prev => prev.map(storyUser => {
        if (storyUser.user._id === data.userId) {
          return {
            ...storyUser,
            stories: storyUser.stories.filter(s => s._id !== data.storyId)
          };
        }
        return storyUser;
      }).filter(storyUser => storyUser.stories.length > 0));
    });

    return () => {
      channel.unbind('story-viewed');
      channel.unbind('story-new');
      channel.unbind('story-deleted');
    };
  }, [currentUser?._id, fetchStories]);

  const hasUnviewedStories = useCallback((storyUser: StoryUser) => {
    return storyUser.stories.some((s) => {
      const viewedBy = s.viewedBy || [];
      return !viewedBy.some(v => v.userId === currentUser?._id);
    });
  }, [currentUser?._id]);

  return {
    stories,
    loading,
    fetchStories,
    markStoryAsViewed,
    hasUnviewedStories,
    setStories,
  };
}

