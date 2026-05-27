'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';

interface User {
  _id: string;
  username: string;
  email: string;
  name?: string;
  bio?: string;
  avatar?: string;
  gender?: string;
  location?: string;
  links?: { label: string; url: string }[];
  readReceipts: boolean;
  twoFactorEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface UseAccountSettingsProps {
  currentUser: User;
  onUserUpdate: (updatedUser: User) => void;
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

export function useAccountSettings({
  currentUser,
  onUserUpdate,
  setFeedback,
}: UseAccountSettingsProps) {
  const [username, setUsername] = useState(currentUser.username || '');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  const [name, setName] = useState(currentUser.name || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [gender, setGender] = useState(currentUser.gender || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [locationQuery, setLocationQuery] = useState(currentUser.location || '');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [links, setLinks] = useState<{ label: string; url: string }[]>(currentUser.links || []);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUsername(currentUser.username || '');
    setName(currentUser.name || '');
    setBio(currentUser.bio || '');
    setGender(currentUser.gender || '');
    setLocation(currentUser.location || '');
    setLocationQuery(currentUser.location || '');
    setLinks(currentUser.links || []);
  }, [currentUser]);

  const searchLocations = async (query: string) => {
    if (!query || query.length < 3 || query === location) {
      setLocationSuggestions([]);
      return;
    }
    setSearchingLocation(true);
    try {
      const res = await apiFetch(
        `/api/geolocation/search?q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setLocationSuggestions(data);
      }
    } catch (err) {
      console.error('Search suggestions error:', err);
    } finally {
      setSearchingLocation(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchLocations(locationQuery);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [locationQuery]);

  const handleSelectSuggestion = (suggestion: any) => {
    const addr = suggestion.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || '';
    const country = addr.country || '';
    const formatted = city && country ? `${city}, ${country}` : (city || country || suggestion.display_name || '');

    setLocation(formatted);
    setLocationQuery(formatted);
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };

  const handleLocationBlur = () => {
    setTimeout(() => {
      if (locationQuery === '') {
        setLocation('');
      } else if (locationQuery !== location) {
        setLocationQuery(location);
      }
      setShowSuggestions(false);
    }, 250);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'Geolocation is not supported by your browser.' });
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await apiFetch(
            `/api/geolocation/reverse?lat=${latitude}&lon=${longitude}`
          );
          if (!res.ok) throw new Error('Failed to fetch address');
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || '';
          const country = addr.country || '';
          const formatted = city && country ? `${city}, ${country}` : (city || country || data.display_name || '');
          setLocation(formatted);
          setLocationQuery(formatted);
          setLocationSuggestions([]);
          setFeedback({ type: 'success', message: 'Location fetched successfully!' });
        } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', message: 'Could not fetch address details.' });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error(error);
        setFeedback({ type: 'error', message: error.message || 'Permission denied or locator failed.' });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    const finalLocation = locationQuery.trim() === '' ? '' : location;

    try {
      const response = await apiFetch(`/api/profile`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          bio,
          gender,
          location: finalLocation,
          links,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile');

      onUserUpdate(data.user);
      setLocation(data.user.location || '');
      setLocationQuery(data.user.location || '');
      setFeedback({ type: 'success', message: 'Profile settings updated!' });
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await apiFetch(`/api/users/profile/upload`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) throw new Error('Failed to upload image');
      const uploadData = await response.json();
      const avatarUrl = uploadData.url;

      const saveResponse = await apiFetch(`/api/profile`, {
        method: 'PATCH',
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      if (!saveResponse.ok) throw new Error('Failed to save profile picture');

      onUserUpdate({ ...currentUser, avatar: avatarUrl });
      setFeedback({ type: 'success', message: 'Avatar updated successfully!' });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setFeedback({ type: 'error', message: error.message || 'Failed to upload.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username === currentUser.username) return;

    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setUsernameError('Usernames must be 3-20 characters and contain lowercase letters, numbers, or underscores.');
      return;
    }

    setCheckingUsername(true);
    setUsernameError('');
    setUsernameSuccess('');

    try {
      const response = await apiFetch(`/api/profile`, {
        method: 'PATCH',
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'This username is already taken.');
      }

      onUserUpdate({ ...currentUser, username: data.user?.username || username });
      setUsernameSuccess('Username has been updated successfully.');
      setFeedback({ type: 'success', message: 'Username updated!' });
    } catch (err: any) {
      setUsernameError(err.message || 'Failed to update username.');
    } finally {
      setCheckingUsername(false);
    }
  };

  return {
    username,
    setUsername,
    checkingUsername,
    usernameError,
    setUsernameError,
    usernameSuccess,
    setUsernameSuccess,
    name,
    setName,
    bio,
    setBio,
    gender,
    setGender,
    location,
    locationQuery,
    setLocationQuery,
    locationSuggestions,
    searchingLocation,
    isLocating,
    showSuggestions,
    setShowSuggestions,
    links,
    setLinks,
    savingProfile,
    uploadingAvatar,
    avatarInputRef,
    handleSelectSuggestion,
    handleLocationBlur,
    handleLocateMe,
    handleUpdateProfile,
    handleAvatarUpload,
    handleUpdateUsername,
  };
}
