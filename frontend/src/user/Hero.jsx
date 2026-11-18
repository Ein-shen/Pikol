import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Signout } from './Signout';

export const Hero = () => {
  const navigate = useNavigate();

  // User information (null until fetchUser finishes loading it)
  const [user, setUser] = useState(null);

  // Dropdown
  const [showDropdown, setShowDropdown] = useState(false);
  const menuRef = useRef(null);

  // Edit profile
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    fullname: '',
    username: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Profile photo
  const fileInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ==========================================
  // FETCH USER
  // ==========================================

  // Define an async function so we can use "await" inside it
  const fetchUser = async () => {
    // try/catch lets us handle network or server errors without crashing the page
    try {
      // Send a GET request to /api/me (base URL comes from api.js).
      // The auth token is sent along, so the server knows which user this is.
      // "await" pauses here until the server responds.
      const res = await api.get('/me');

      // axios puts the server's JSON body in res.data.
      // If the server wraps it as { user: {...} }, use res.data.user;
      // otherwise (the "||" fallback) use res.data directly.
      const userData = res.data.user || res.data;

      // Save the user in React state. This triggers a re-render, so the
      // username, full name, email, and photo appear on screen.
      setUser(userData);
    } catch (err) {
      // Runs if the request fails (401, 404, 500, network down...).
      // We only log it; the page keeps rendering with user = null.
      console.error('Get User error:', err);
    }
  };

  // Run code after the component first renders
  useEffect(() => {
    // Call fetchUser once to load the profile when the page opens
    fetchUser();
    // Empty dependency array [] means "run only once, on mount"
  }, []);

  // ==========================================
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
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
  // CLOSE EDITING ON ESCAPE
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
  // NAVIGATION
  // ==========================================

  const go = (path) => {
    setShowDropdown(false);
    navigate(path);
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    setShowDropdown(false);
    localStorage.removeItem('token');
    navigate('/login');
  };

  // ==========================================
  // OPEN EDIT PROFILE
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
  // SAVE PROFILE (PUT /api/me)
  // ==========================================

  const handleSave = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError('');

    try {
      const res = await api.put('/me', form);

      const updatedUser = res.data.user || res.data;

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
  // UPLOAD PROFILE PHOTO (POST /api/me/photo)
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

    // Show an instant local preview while uploading
    setPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);

    try {
      const imageData = new FormData();
      imageData.append('photo', file); // must match upload.single("photo") on the server

      // Explicit multipart header so it works even if api.js defaults to JSON
      const response = await api.post('/me/photo', imageData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedUser = response.data.user;

      setUser(updatedUser);
      setPhotoPreview(''); // was null
    } catch (err) {
      console.error('Profile photo upload error:', err);
      alert(err.response?.data?.message || 'Failed to upload profile photo.');
      setPhotoPreview(''); // was null
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // ==========================================
  // CLEAN UP PREVIEW URL
  // ==========================================

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  return (
    <div className="flex w-full flex-col gap-10 sm:gap-20">
      {/* HEADER */}
      <header className="flex flex-row items-center justify-between">
        <button
          type="button"
          className="rounded-md p-2 opacity-60 transition hover:opacity-100"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft />
        </button>

        {/* USERNAME DROPDOWN */}
        <div ref={menuRef} className="relative">
          <div className="flex flex-row items-center gap-1 text-xl font-bold">
            <span>@{user?.username}</span>

            <button
              type="button"
              onClick={() => setShowDropdown((prev) => !prev)}
              aria-label="Toggle menu"
              aria-haspopup="menu"
              aria-expanded={showDropdown}
              className="theme-text rounded-lg p-1 opacity-60 transition hover:opacity-100"
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
              className="theme-card theme-border theme-text absolute left-1/2 top-full z-50 mt-2 flex min-w-44 -translate-x-1/2 flex-col overflow-hidden rounded-md border shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={openEdit}
                className="w-full border-b border-white/10 px-4 py-2  text-left text-xs theme-hover"
              >
                Edit profile
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => go('/add-account')}
                className="w-full border-b border-white/10 px-4 py-2 text-left text-xs theme-hover"
              >
                Add account
              </button>

              <Signout
              className='w-full border-b border-white/10 px-4 py-2 text-left text-xs theme-hover '
               />
            </div>
          )}
        </div>

        <div className="w-10" />
      </header>

      {/* PROFILE CONTENT */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-stretch sm:justify-center">
        {/* PROFILE PHOTO */}
        {/* PROFILE PHOTO */}
        <div className="relative flex flex-col items-center">
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
            className="theme-border theme-accent flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border sm:h-32 sm:w-32 disabled:opacity-50"
          >
            <img
              src={
                photoPreview ||
                user?.photo_url ||
                'https://img.icons8.com/?size=100&id=12438&format=png&color=000000'
              }
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </button>

          {uploadingPhoto && (
            <span className="absolute left-0 right-0 top-full mt-1 text-center text-xs opacity-60">
              Uploading photo...
            </span>
          )}
        </div>

        {/* NAME AND EMAIL */}
        {isEditing ? (
          <form
            onSubmit={handleSave}
            className="flex w-full max-w-xs flex-col gap-3 sm:w-72"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-fullname" className="text-sm font-semibold">
                Name
              </label>

              <input
                id="edit-fullname"
                value={form.fullname}
                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                className="theme-border w-full rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none"
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
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="theme-border w-full rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none"
                required
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="theme-card theme-border theme-hover rounded-md border px-4 py-1.5 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
         <div className="flex w-full min-w-0 max-w-xs flex-col justify-between self-stretch text-center sm:w-auto sm:text-left">
          <div className="flex flex-col gap-1">
            <span className="break-words text-xl font-bold capitalize leading-tight sm:text-2xl">
              {user?.fullname}
            </span>
            <span className="theme-muted break-all text-sm">
              {user?.email}
            </span>
          </div>

          <button
            type="button"
            aria-label="Edit profile"
            onClick={openEdit}
            className="flex w-full items-center justify-center gap-2 rounded-md border px-2 py-1 text-xs opacity-60 transition hover:opacity-100 theme-border-2"
          >
            Edit Profile
            <img src="https://img.icons8.com/?size=100&id=11737&format=png&color=000000" alt="" height={14} width={14} className="theme-icon" />
          </button>
        </div>
        )}
      </div>
    </div>
  );
};