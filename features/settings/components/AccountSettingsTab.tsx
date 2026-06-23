'use client';

import { Loader2, Camera, Save, MapPin, Link as LinkIcon, Plus, Trash2, User as UserIcon, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAccountSettings } from '../hooks/useAccountSettings';

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

interface AccountSettingsTabProps {
  currentUser: User;
  onUserUpdate: (updatedUser: User) => void;
  setFeedback: (fb: { type: 'success' | 'error'; message: string } | null) => void;
}

export default function AccountSettingsTab({
  currentUser,
  onUserUpdate,
  setFeedback,
}: AccountSettingsTabProps) {
  const {
    username,
    setUsername,
    checkingUsername,
    usernameError,
    usernameSuccess,
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
  } = useAccountSettings({ currentUser, onUserUpdate, setFeedback });

  return (
    <div>
      <h2 className="text-xl font-bold text-chat-text-primary mb-6 flex items-center gap-3">
        <UserIcon className="w-6 h-6 text-chat-accent" />
        Account Settings
      </h2>

      {/* Avatar Upload */}
      <div className="flex flex-col items-center mb-8 pb-6 border-b border-chat-border/30">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-chat-accent to-chat-accent-secondary flex items-center justify-center text-white font-bold text-2xl shadow-xl overflow-hidden border-4 border-chat-bg-primary">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              currentUser.username?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <input
            type="file"
            ref={avatarInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarUpload}
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute bottom-0 right-0 p-2 bg-chat-accent text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 border-2 border-chat-bg-primary"
          >
            {uploadingAvatar ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <p className="text-xs text-chat-text-tertiary mt-2">Click the camera to upload a new profile picture</p>
      </div>

      {/* Username Update Form */}
      <form onSubmit={handleUpdateUsername} className="space-y-6 pb-8">
        <div className="space-y-2">
          <label className="text-sm font-bold text-chat-text-secondary">
            Change Username
          </label>
          <p className="text-xs text-chat-text-tertiary">
            Customize your handle. Other users will be able to search and message you with this identifier.
          </p>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-chat-text-tertiary font-bold">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
              }}
              placeholder="username"
              className="w-full pl-9 pr-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium"
              disabled={checkingUsername}
              maxLength={20}
              required
            />
          </div>

          {usernameError && (
            <p className="text-sm text-red-500 font-semibold mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              {usernameError}
            </p>
          )}

          {usernameSuccess && (
            <p className="text-sm text-green-500 font-semibold mt-2 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              {usernameSuccess}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={checkingUsername || username === currentUser.username || !username}
          className="px-6 py-4 bg-chat-accent hover:bg-chat-accent-hover text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-chat-accent/20 disabled:opacity-50"
        >
          {checkingUsername ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          {checkingUsername ? 'Updating Username...' : 'Update Username'}
        </button>
      </form>

      {/* Profile Information Update Form */}
      <form onSubmit={handleUpdateProfile} className="space-y-6 pt-8 border-t border-chat-border/30">
        <h3 className="text-lg font-bold text-chat-text-primary flex items-center gap-2 mb-2">
          <UserIcon className="w-5 h-5 text-chat-accent" />
          Profile Information
        </h3>

        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-chat-text-secondary">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            className="w-full px-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-chat-text-secondary">Bio</label>
            <span className={`text-xs font-semibold ${bio.length >= 200 ? 'text-red-500' : 'text-chat-text-tertiary'}`}>
              {bio.length}/200
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => {
              if (e.target.value.length <= 200) {
                setBio(e.target.value);
              }
            }}
            placeholder="Tell other users about yourself..."
            rows={3}
            maxLength={200}
            className="w-full px-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary placeholder-chat-text-tertiary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 transition-all font-medium resize-none"
          />
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-chat-text-secondary">Gender</label>
            {gender && (
              <button
                type="button"
                onClick={() => setGender('')}
                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <X className="w-4 h-4" /> Clear Selection
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-1">
            {['male', 'female', 'prefer not to say'].map((opt) => {
              const isSelected = gender.toLowerCase() === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setGender(opt)}
                  className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border capitalize ${
                    isSelected
                      ? 'bg-chat-accent text-white border-chat-accent shadow-lg shadow-chat-accent/20 scale-[1.02]'
                      : 'bg-chat-input hover:bg-chat-hover text-chat-text-secondary border-chat-border'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="mt-2">
            <input
              type="text"
              value={['male', 'female', 'prefer not to say'].includes(gender.toLowerCase()) ? '' : gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="Or type a custom gender..."
              className="w-full px-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium text-sm animate-in fade-in-50 duration-200"
            />
          </div>
        </div>

        {/* Location autocomplete */}
        <div className="space-y-2 relative">
          <label className="text-sm font-bold text-chat-text-secondary">Location</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-chat-text-tertiary">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocationQuery(val);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={handleLocationBlur}
                placeholder="Search city, country..."
                className="w-full pl-11 pr-4 py-4 bg-chat-input border border-chat-border rounded-2xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium"
              />
              {searchingLocation && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-chat-accent animate-spin" />
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="px-5 py-4 bg-chat-input hover:bg-chat-hover border border-chat-border text-chat-text-primary hover:text-chat-accent font-bold rounded-2xl transition-all flex items-center gap-2 shrink-0"
              title="Find my exact location"
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-chat-accent" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Locate Me</span>
            </button>
          </div>

          {showSuggestions && locationSuggestions.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-chat-bg-secondary border border-chat-border rounded-2xl shadow-xl overflow-hidden z-[110] backdrop-blur-2xl max-h-60 overflow-y-auto">
              {locationSuggestions.map((sug) => {
                const addr = sug.address || {};
                const city = addr.city || addr.town || addr.village || addr.municipality || addr.city_district || '';
                const country = addr.country || '';
                const formatted = city && country ? `${city}, ${country}` : (city || country || sug.display_name || '');
                return (
                  <button
                    key={sug.place_id}
                    type="button"
                    onMouseDown={() => handleSelectSuggestion(sug)}
                    className="w-full text-left px-5 py-3 hover:bg-chat-hover text-sm text-chat-text-primary border-b border-chat-border/50 last:border-0 font-medium transition-colors"
                  >
                    {formatted}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Links Section */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-chat-text-secondary flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-chat-accent" />
            Links
          </label>
          {links.map((link, index) => (
            <div key={index} className="flex gap-2 animate-in fade-in-50 duration-200">
              <input
                type="text"
                value={link.label}
                onChange={(e) => {
                  const newLinks = [...links];
                  newLinks[index].label = e.target.value;
                  setLinks(newLinks);
                }}
                placeholder="Label (e.g. Website, Twitter)"
                className="flex-1 px-4 py-3 bg-chat-input border border-chat-border rounded-xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium text-sm"
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) => {
                  const newLinks = [...links];
                  newLinks[index].url = e.target.value;
                  setLinks(newLinks);
                }}
                placeholder="https://..."
                className="flex-1 px-4 py-3 bg-chat-input border border-chat-border rounded-xl text-chat-text-primary focus:outline-none focus:ring-2 focus:ring-chat-accent/50 font-medium text-sm"
              />
              <button
                type="button"
                onClick={() => setLinks(links.filter((_, i) => i !== index))}
                className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLinks([...links, { label: '', url: '' }])}
            className="w-full py-3 border-2 border-dashed border-chat-border rounded-xl text-chat-text-secondary hover:border-chat-accent hover:text-chat-accent transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={savingProfile || !(name !== (currentUser.name || '') || bio !== (currentUser.bio || '') || gender !== (currentUser.gender || '') || locationQuery !== (currentUser.location || '') || JSON.stringify(links) !== JSON.stringify(currentUser.links || []))}
          className="px-6 py-4 bg-chat-accent hover:bg-chat-accent-hover text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-chat-accent/20 disabled:opacity-50"
        >
          {savingProfile ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {savingProfile ? 'Saving Settings...' : 'Save Profile Settings'}
        </button>
      </form>
    </div>
  );
}
