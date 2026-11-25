
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Signout } from './Signout';

export const Hero = () => {
  const navigate = useNavigate();

  // ==========================================
  // 1. USER INFORMATION
  // ==========================================

  // Stores the logged-in user's information.
  // Initially null because we haven't fetched the user yet.
  const [user, setUser] = useState(null);

  // ==========================================
  // 2. DROPDOWN STATE
  // ==========================================

  // Controls whether the username dropdown is visible.
  // false = closed, true = open.
  const [showDropdown, setShowDropdown] = useState(false);

  // useRef gives us access to the actual dropdown HTML element.
  // We use it to detect clicks outside the dropdown.
  const menuRef = useRef(null);

  // ==========================================
  // 3. EDIT PROFILE STATE
  // ==========================================

  // Controls whether the edit profile form is visible.
  const [isEditing, setIsEditing] = useState(false);

  // Stores the values entered into the edit profile form.
  const [form, setForm] = useState({
    fullname: '',
    username: ''
  });

  // Tracks whether the profile is currently being saved.
  const [saving, setSaving] = useState(false);

  // Stores error messages if saving fails.
  const [error, setError] = useState('');

  // ==========================================
  // 4. PROFILE PHOTO STATE
  // ==========================================

  // Allows us to access the hidden file input.
  const fileInputRef = useRef(null);

  // Temporarily displays the selected image before uploading.
  const [photoPreview, setPhotoPreview] = useState('');

  // Tracks whether the image is currently uploading.
  const [uploadingPhoto, setUploadingPhoto] = useState(false);


  // ==========================================
  // 5. FETCH USER
  // ==========================================

  // Gets the currently logged-in user's information
  // from the backend endpoint GET /me.
  const fetchUser = async () => {
    try {
      const res = await api.get('/me');

      // Some APIs return { user: {...} }, while others
      // return the user object directly.
      const userData = res.data.user || res.data;

      // Saves the fetched user information in React state.
      setUser(userData);

    } catch (err) {
      console.error('Get User error:', err);
    }
  };

  // useEffect runs after the component first appears.
  // The empty dependency array [] means it runs once
  // when this component mounts.
  useEffect(() => {
    fetchUser();
  }, []);


  // ==========================================
  // 6. CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // ==========================================

  useEffect(() => {

    // If the dropdown is already closed, do nothing.
    if (!showDropdown) return;

    // Checks whether the user clicked outside the dropdown.
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    // Closes the dropdown when the user presses Escape.
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    // Listen for mouse clicks and keyboard presses.
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);

    // Cleanup: remove listeners when the dropdown closes
    // or when the component is removed.
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };

  }, [showDropdown]);


  // ==========================================
  // 7. CLOSE EDITING WHEN PRESSING ESCAPE
  // ==========================================

  useEffect(() => {

    // Only listen for Escape when the edit form is open.
    if (!isEditing) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
      }
    };

    document.addEventListener('keydown', handleKey);

    // Remove the event listener when editing ends.
    return () => {
      document.removeEventListener('keydown', handleKey);
    };

  }, [isEditing]);


  // ==========================================
  // 8. NAVIGATION
  // ==========================================

  // Closes the dropdown before navigating to another page.
  const go = (path) => {
    setShowDropdown(false);
    navigate(path);
  };


  // ==========================================
  // 9. LOGOUT
  // ==========================================

  const handleLogout = () => {
    // Close the dropdown.
    setShowDropdown(false);

    // Remove the saved authentication token.
    localStorage.removeItem('token');

    // Redirect the user to the login page.
    navigate('/login');
  };


  // ==========================================
  // 10. OPEN EDIT PROFILE
  // ==========================================

  const openEdit = () => {

    // Copy the current user information into the form.
    // The ?? '' means use an empty string if the value is null
    // or undefined.
    setForm({
      fullname: user?.fullname ?? '',
      username: user?.username ?? ''
    });

    // Clear any previous error message.
    setError('');

    // Close the dropdown.
    setShowDropdown(false);

    // Display the edit form.
    setIsEditing(true);
  };


  // ==========================================
  // 11. SAVE PROFILE (PUT /api/me)
  // ==========================================

  const handleSave = async (e) => {

    // Prevent the browser from refreshing the page
    // when the form is submitted.
    e.preventDefault();

    setSaving(true);
    setError('');

    try {

      // Send the updated form information to the backend.
      const res = await api.put('/me', form);

      // Get the updated user information from the response.
      const updatedUser = res.data.user || res.data;

      // Update the displayed user information.
      setUser(updatedUser);

      // Close the edit form after successful saving.
      setIsEditing(false);

    } catch (err) {
      console.error('Update profile error:', err);

      // Display the backend error if available.
      // Otherwise, display our default error message.
      setError(
        err.response?.data?.message ||
        'Could not save your changes. Try again.'
      );

    } finally {

      // Runs whether saving succeeds or fails.
      // Allows the Save button to become active again.
      setSaving(false);
    }
  };


  // ==========================================
  // 12. UPLOAD PROFILE PHOTO (POST /api/me/photo)
  // ==========================================

  const handlePhotoChange = async (e) => {

    // Get the first selected file from the input.
    const file = e.target.files?.[0];

    // Stop if the user did not select a file.
    if (!file) return;


    // Check whether the selected file is an image.
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image.');
      e.target.value = '';
      return;
    }


    // Limit the image size to 5 MB.
    // 1024 * 1024 = 1 MB.
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }


    // Create a temporary preview URL.
    // This lets the user see the image before uploading finishes.
    setPhotoPreview(URL.createObjectURL(file));

    setUploadingPhoto(true);

    try {

      // FormData is used when sending files to the backend.
      const imageData = new FormData();

      // The name "photo" must match upload.single("photo")
      // in your backend Multer configuration.
      imageData.append('photo', file);


      // Upload the image to POST /me/photo.
      const response = await api.post('/me/photo', imageData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });


      // Get the updated user information.
      const updatedUser = response.data.user;

      // Update the user state with the new profile photo URL.
      setUser(updatedUser);

      // Remove the temporary preview.
      setPhotoPreview('');

    } catch (err) {
      console.error('Profile photo upload error:', err);

      alert(
        err.response?.data?.message ||
        'Failed to upload profile photo.'
      );

      // Clear the temporary preview if uploading fails.
      setPhotoPreview('');

    } finally {

      // Stop the uploading indicator.
      setUploadingPhoto(false);

      // Reset the file input so the same file can be selected again.
      e.target.value = '';
    }
  };


  // ==========================================
  // 13. CLEAN UP PREVIEW URL
  // ==========================================

  useEffect(() => {

    // This cleanup runs when photoPreview changes
    // or when the component is removed.
    return () => {

      // Release the temporary browser URL.
      // This helps prevent unnecessary memory usage.
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };

  }, [photoPreview]);


  // ==========================================
  // 14. DISPLAY COMPONENT
  // ==========================================

  return (
    <div className="flex w-full flex-col gap-8 sm:gap-12">

      {/* HEADER */}
      <header className="flex flex-row items-center justify-center gap-2">

        {/* USERNAME DROPDOWN */}
        <div ref={menuRef} className="relative min-w-0">

          <div className="flex min-w-0 flex-row items-center gap-1 text-lg font-bold sm:text-2xl">

            {/* Display the username after the user data loads. */}
            <span className="max-w-[40vw] truncate sm:max-w-xs">
              {user?.username ? `@${user.username}` : ''}
            </span>

            {/* Button that opens and closes the dropdown. */}
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


          {/* Only display the dropdown when showDropdown is true. */}
          {showDropdown && (
            <div
              role="menu"
              className="theme-card theme-border animate-fade-in animation-delay-100 border-b theme-text absolute left-1/2 top-full z-50 mt-2 flex w-44 max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-md border shadow-lg sm:w-52"
            >

              {/* EDIT PROFILE OPTION */}
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


              {/* ADD ACCOUNT OPTION */}
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


              {/* SIGN OUT OPTION */}
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

        {/* Empty space helps keep the username centered. */}
        <div className="w-10 shrink-0" />

      </header>


      {/* ==========================================
          PROFILE CONTENT
      ========================================== */}

      <div className="flex flex-row items-center justify-center pt-10 gap-4 sm:gap-6">

        {/* PROFILE PHOTO */}
        <div className="relative flex shrink-0 flex-col items-center">

          {/* Hidden file input.
              The visible photo button opens this input. */}
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

            {/* Show the temporary preview first.
                If there is no preview, show the saved profile photo.
                If there is no saved photo, show the default image. */}
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

          {/* Display upload status while the photo is uploading. */}
          {uploadingPhoto && (
            <span className="absolute left-0 right-0 top-full mt-1 whitespace-nowrap text-center text-xs opacity-60">
              Uploading photo...
            </span>
          )}

        </div>


        {/* NAME AND EMAIL */}
        {isEditing ? (

          // If editing is true, display the edit form.
          <form
            onSubmit={handleSave}
            className="flex w-full max-w-sm flex-col gap-3 sm:w-72"
          >

            {/* FULL NAME INPUT */}
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


            {/* USERNAME INPUT */}
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


            {/* SHOW ERROR IF SAVING FAILS */}
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}


            {/* SAVE AND CANCEL BUTTONS */}
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

          // If editing is false, display the normal profile information.
          <div className="flex w-full min-w-0 max-w-[16rem] flex-col items-center gap-3 self-center text-center sm:w-auto sm:min-w-[12rem] sm:max-w-xs sm:items-stretch sm:justify-between sm:self-stretch sm:text-left">

            <div className="flex min-w-0 flex-col gap-3">

              {/* Display the user's full name. */}
              <span className="break-words text-2xl font-bold capitalize leading-tight sm:text-2xl">
                {user?.fullname}
              </span>

              {/* Display the user's email. */}
              <span className="theme-muted break-all text-md">
                {user?.email}
              </span>

            </div>


            {/* Opens the edit profile form. */}
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
