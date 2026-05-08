'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { pusherClient } from '@/lib/pusher-client';
import { Story, StoryUser } from '@/types/chat';

export function useStories(currentUserId: string) {
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
    try {
      const response = await apiFetch(`/api/stories/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ storyId }),
      });

      if (response.ok) {
        setStories(prev => prev.map(storyUser => ({
          ...storyUser,
          stories: storyUser.stories.map(s => 
            s._id === storyId ? { ...s, viewedBy: [...(s.viewedBy || []), { userId: currentUserId, viewedAt: new Date().toISOString() }] } : s
          )
        })));
      }
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchStories();

    if (!currentUserId) return;

    const channel = pusherClient.subscribe(`user-${currentUserId}`);

    channel.bind('story-viewed', (data: { storyId: string, viewedBy: string }) => {
      setStories(prev => prev.map(storyUser => ({
        ...storyUser,
        stories: storyUser.stories.map(s => {
          if (s._id === data.storyId) {
            const viewedBy = s.viewedBy || [];
            if (!viewedBy.some(v => v.userId === data.viewedBy)) {
              return {
                ...s,
                viewedBy: [...viewedBy, { userId: data.viewedBy, viewedAt: new Date().toISOString() }]
              };
            }
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
      pusherClient.unsubscribe(`user-${currentUserId}`);
    };
  }, [currentUserId, fetchStories]);

  const hasUnviewedStories = useCallback((storyUser: StoryUser) => {
    return storyUser.stories.some((s) => {
      const viewedBy = s.viewedBy || [];
      return !viewedBy.some(v => v.userId === currentUserId);
    });
  }, [currentUserId]);

  return {
    stories,
    loading,
    fetchStories,
    markStoryAsViewed,
    hasUnviewedStories,
    setStories,
  };
}
