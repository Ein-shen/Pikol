
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Signout } from './Signout';

// ==========================================
// 1. CACHE KEY
// ==========================================

// This is the name of the storage location in the browser.
// We use this name whenever we want to READ, SAVE, or DELETE
// the cached user information.
const CACHE_KEY = 'cachedHeroUser';

// ==========================================
// 2. HERO COMPONENT
// ==========================================

export const Hero = () => {
  const navigate = useNavigate();

  // ==========================================
  // 3. USER INFORMATION
  // ==========================================

  // LOAD USER DATA FROM LOCALSTORAGE
  const [user, setUser] = useState(() => {

    try {
      // localStorage.getItem() reads previously saved data.
      // CACHE_KEY tells it which saved data we want.
      //
      // Example:
      // localStorage.getItem('cachedHeroUser')
      //
      // The returned value is a STRING, not a JavaScript object.
      const saved = localStorage.getItem(CACHE_KEY);

      // JSON.parse() converts the saved STRING back into
      // a JavaScript OBJECT that React can use.
      //
      // If saved data exists, load it.
      // If nothing exists, start with null.
      return saved ? JSON.parse(saved) : null;

    } catch (error) {
      // If the saved data is invalid, avoid crashing the component.
      console.error('Failed to load user cache:', error);
      return null;
    }
  });

  // ==========================================
  // 4. DROPDOWN STATE
  // ==========================================

  const [showDropdown, setShowDropdown] = useState(false);
  const menuRef = useRef(null);

  // ==========================================
  // 5. EDIT PROFILE STATE
  // ==========================================

  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    fullname: '',
    username: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ==========================================
  // 6. PROFILE PHOTO STATE
  // ==========================================

  const fileInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ==========================================
  // 7. AUTOMATICALLY SAVE USER TO LOCALSTORAGE
  // ==========================================

  useEffect(() => {

    // This effect runs whenever the "user" state changes.
    //
    // If user contains information, save it.
    if (user) {

      try {
        // JSON.stringify() converts the JavaScript OBJECT
        // into a STRING because localStorage only stores strings.
        //
        // localStorage.setItem() saves that string in the browser.
        //
        // First argument: the storage key/name.
        // Second argument: the data we want to save.
        //
        // Example:
        // Key:   "cachedHeroUser"
        // Value: '{"fullname":"Shen","username":"shen"}'
        localStorage.setItem(CACHE_KEY, JSON.stringify(user));

      } catch (error) {
        console.error('Failed to save user cache:', error);
      }

    } else {

      // If user becomes null, remove the old cached information.
      localStorage.removeItem(CACHE_KEY);
    }

  }, [user]); // Watch user. Run this effect whenever user changes.

  // ==========================================
  // 8. FETCH USER
  // ==========================================

  const fetchUser = async () => {
    try {
      // Get the latest user information from the backend.
      const res = await api.get('/me');

      const userData = res.data.user || res.data;

      // Update React state with the latest backend information.
      //
      // IMPORTANT:
      // We don't need to manually save to localStorage here.
      //
      // Updating user triggers the useEffect in section 7.
      // That effect automatically saves the updated user.
      setUser(userData);

    } catch (err) {
      console.error('Get User error:', err);

      // If the backend request fails, keep the cached user visible.
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // ==========================================
  // 9. CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // ==========================================

  useEffect(() => {
    if (!showDropdown) return;

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showDropdown]);

  // ==========================================
  // 10. CLOSE EDITING WHEN PRESSING ESCAPE
  // ==========================================

  useEffect(() => {
    if (!isEditing) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
    };
  }, [isEditing]);

  // ==========================================
  // 11. NAVIGATION
  // ==========================================

  const go = (path) => {
    setShowDropdown(false);
    navigate(path);
  };

  // ==========================================
  // 12. LOGOUT
  // ==========================================

  const handleLogout = () => {
    setShowDropdown(false);

    // Delete the login token.
    localStorage.removeItem('token');

    // DELETE THE CACHED USER INFORMATION.
    // This prevents the next account from seeing the previous
    // account's saved profile information.
    localStorage.removeItem(CACHE_KEY);

    navigate('/login');
  };

  // ==========================================
  // 13. OPEN EDIT PROFILE
  // ==========================================

  const openEdit = () => {
    setForm({
      fullname: user?.fullname ?? '',
      username: user?.username ?? ''
    });

    setError('');
    setShowDropdown(false);
    setIsEditing(true);
  };

  // ==========================================
  // 14. SAVE PROFILE
  // ==========================================

  const handleSave = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError('');

    try {
      const res = await api.put('/me', form);

      const updatedUser = res.data.user || res.data;

      // Update React state with the new information.
      //
      // This automatically triggers the localStorage useEffect.
      // So we don't need to call localStorage.setItem() here.
      setUser(updatedUser);

      setIsEditing(false);

    } catch (err) {
      console.error('Update profile error:', err);

      setError(
        err.response?.data?.message ||
        'Could not save your changes. Try again.'
      );

    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // 15. UPLOAD PROFILE PHOTO
  // ==========================================

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));

    setUploadingPhoto(true);

    try {
      const imageData = new FormData();

      imageData.append('photo', file);

      const response = await api.post('/me/photo', imageData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const updatedUser = response.data.user || response.data;

      // Update user with the new profile photo URL.
      //
      // This triggers the useEffect in section 7.
      // The updated user object, including the new photo URL,
      // is automatically saved to localStorage.
      setUser(updatedUser);

      setPhotoPreview('');

    } catch (err) {
      console.error('Profile photo upload error:', err);

      alert(
        err.response?.data?.message ||
        'Failed to upload profile photo.'
      );

      setPhotoPreview('');

    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // ==========================================
  // 16. CLEAN UP PREVIEW URL
  // ==========================================

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // ==========================================
  // 17. DISPLAY COMPONENT
  // ==========================================

  return (
    <div className="flex w-full flex-col gap-8 sm:gap-12">

      {/* HEADER */}
      <header className="flex flex-row items-center justify-center gap-2">

        {/* USERNAME DROPDOWN */}
        <div ref={menuRef} className="relative min-w-0">

          <div className="flex min-w-0 flex-row items-center gap-1 text-lg font-bold sm:text-2xl">

            <span className="max-w-[40vw] truncate sm:max-w-xs">
              {user?.username ? `@${user.username}` : ''}
            </span>

            <button
              type="button"
              onClick={() => setShowDropdown((prev) => !prev)}
              aria-label="Toggle menu"
              aria-haspopup="menu"
              aria-expanded={showDropdown}
              className="theme-text shrink-0 rounded-lg p-1 opacity-60 transition hover:opacity-100"
            >
              <ChevronDown
                size={20}
                className={`transition-transform duration-200 ${
                  showDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

          </div>

          {showDropdown && (
            <div
              role="menu"
              className="theme-card theme-border animate-fade-in animation-delay-100 border-b theme-text absolute left-1/2 top-full z-50 mt-2 flex w-44 max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-md border shadow-lg sm:w-52"
            >

              <button
                type="button"
                role="menuitem"
                onClick={openEdit}
                className="theme-hover w-full theme-border border-b flex flex-row items-center gap-2 px-4 py-3 text-left text-sm sm:py-2.5"
              >
                <img
                  src="https://img.icons8.com/?size=100&id=11737&format=png&color=000000"
                  alt=""
                  height={18}
                  width={18}
                  className="theme-icon"
                />
                Edit profile
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => go(' ')}
                className="theme-hover flex flex-row items-center gap-2 w-full theme-border border-b px-4 py-3 text-left text-sm sm:py-2.5"
              >
                <img
                  src="https://img.icons8.com/?size=100&id=24717&format=png&color=000000"
                  alt=""
                  height={18}
                  width={18}
                  className="theme-icon"
                />
                Add account
              </button>

              <span className="theme-hover flex flex-row items-center gap-2 w-full px-4 py-3 text-left text-sm sm:py-2.5">

                <img
                  src="https://img.icons8.com/?size=100&id=96qSfJhNi0UF&format=png&color=000000"
                  alt=""
                  height={18}
                  width={18}
                  className="theme-icon"
                />

                <Signout className="theme-hover w-full text-left text-sm" />

              </span>

            </div>
          )}

        </div>

        <div className="w-10 shrink-0" />

      </header>

      {/* PROFILE CONTENT */}
      <div className="flex flex-row items-center justify-center pt-10 gap-4 sm:gap-6">

        {/* PROFILE PHOTO */}
        <div className="relative flex shrink-0 flex-col items-center">

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            className="hidden"
          />

          <button
            type="button"
            disabled={uploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
            className="theme-border theme-accent flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border disabled:opacity-50 sm:h-44 sm:w-44"
          >
            <img
              src={
                photoPreview ||
                (user?.photo_url
                  ? user.photo_url.replace(/^http:\/\//i, 'https://')
                  : 'https://img.icons8.com/?size=100&id=12438&format=png&color=000000')
              }
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </button>

          {uploadingPhoto && (
            <span className="absolute left-0 right-0 top-full mt-1 whitespace-nowrap text-center text-xs opacity-60">
              Uploading photo...
            </span>
          )}

        </div>

        {/* NAME AND EMAIL */}
        {isEditing ? (

          <form
            onSubmit={handleSave}
            className="flex w-full max-w-sm flex-col gap-3 sm:w-72"
          >

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-fullname" className="text-sm font-semibold">
                Name
              </label>

              <input
                id="edit-fullname"
                value={form.fullname}
                onChange={(e) =>
                  setForm({ ...form, fullname: e.target.value })
                }
                className="theme-border w-full rounded-md border bg-transparent px-3 py-2 text-base outline-none sm:py-1.5 sm:text-sm"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-username" className="text-sm font-semibold">
                Username
              </label>

              <input
                id="edit-username"
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
                className="theme-border w-full rounded-md border bg-transparent px-3 py-2 text-base outline-none sm:py-1.5 sm:text-sm"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60 sm:flex-none sm:py-1.5"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="theme-card theme-border theme-hover flex-1 rounded-md border px-4 py-2 text-sm font-semibold sm:flex-none sm:py-1.5"
              >
                Cancel
              </button>

            </div>

          </form>

        ) : (

          <div className="flex w-full min-w-0 max-w-[16rem] flex-col items-center gap-3 self-center text-center sm:w-auto sm:min-w-[12rem] sm:max-w-xs sm:items-stretch sm:justify-between sm:self-stretch sm:text-left">

            <div className="flex min-w-0 flex-col gap-3">

              <span className="break-words text-2xl font-bold capitalize leading-tight sm:text-2xl">
                {user?.fullname}
              </span>

              <span className="theme-muted break-all text-md">
                {user?.email}
              </span>

            </div>

            <button
              type="button"
              aria-label="Edit profile"
              onClick={openEdit}
              className="theme-border-2 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs opacity-60 transition hover:opacity-100 sm:py-1"
            >
              Edit Profile

              <img
                src="https://img.icons8.com/?size=100&id=11737&format=png&color=000000"
                alt=""
                height={14}
                width={14}
                className="theme-icon"
              />

            </button>

          </div>

        )}

      </div>
    </div>
  );
};
