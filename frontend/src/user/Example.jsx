
// ==========================================
  // GET PROFILE FROM THE SERVER (source of truth)
  // ==========================================
  const fetchProfile = async (userArg) => {
    try {
      const user = userArg || auth.currentUser
      if (!user) return

      setLoadingProfile((prev) => (name || email ? false : prev))

      // Get a fresh auth token to prove to our backend who we are
      const token = await user.getIdToken()

      const response = await fetch(`${API_URL}/api/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get profile')
      }

      // Pull out the fields we care about from the server's response
      const freshName = data.name || ''
      const freshEmail = data.email || ''
      const freshPhotoUrl = data.photo_url || null

      // Update what's shown on screen
      setName(freshName)
      setEmail(freshEmail)
      setPhotoUrl(freshPhotoUrl)

      saveCache(user.uid, {
        name: freshName,
        email: freshEmail,
        photoUrl: freshPhotoUrl,
      })
    } catch (error) {
      console.error('Get profile error:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

  // ==========================================
  // UPLOAD A NEW PROFILE PHOTO
  // ==========================================
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Show an instant local preview of the picked photo before it's
    // even uploaded, using a temporary browser-only URL.
    const objectUrl = URL.createObjectURL(file)
    setPhotoUrl(objectUrl)
    setUploading(true)
    setUploadError(null)

    try {
      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()

      // Photos are sent as multipart form data, not JSON
      const formData = new FormData()
      formData.append('photo', file)

      const response = await fetch(`${API_URL}/api/user/photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload photo')
      }

      // Free up the temporary local preview URL, we don't need it anymore
      URL.revokeObjectURL(objectUrl)

      // Use the real photo URL returned by the server
      setPhotoUrl(data.user.photo_url)

      // ADDED: tell the Navbar so it shows the same picture right away
      window.dispatchEvent(
        new CustomEvent('profile-updated', { detail: { photoUrl: data.user.photo_url } })
      )

      // Update the cache with the new photo too, so it's remembered
      saveCache(user.uid, {
        name,
        email,
        photoUrl: data.user.photo_url,
      })
    } catch (error) {
      console.error('Photo upload error:', error)
      setUploadError('Failed to upload photo. Try again.')
    } finally {
      setUploading(false)
    }
  }

  // Our server sometimes returns a relative path like "/uploads/photo.jpg"
  // instead of a full URL. If so, stick our API_URL in front of it so the
  // <img> tag knows where to actually fetch it from.
  const resolvedPhotoUrl =
    photoUrl && photoUrl.startsWith('/uploads')
      ? `${API_URL}${photoUrl}`
      : photoUrl