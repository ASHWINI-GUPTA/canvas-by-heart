document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const uploadForm = document.getElementById('upload-form');
  const uploadBtn = document.getElementById('upload-btn');
  const syncBtn = document.getElementById('sync-btn');

  let token = localStorage.getItem('adminToken');

  // Check login state
  if (token) {
    showDashboard();
  } else {
    showLogin();
  }

  function showLogin() {
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
  }

  function showDashboard() {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    fetchItems();
  }

  // Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        token = data.token;
        localStorage.setItem('adminToken', token);
        showDashboard();
      } else {
        loginError.textContent = data.error || 'Login failed';
      }
    } catch (err) {
      loginError.textContent = 'Network error';
    }
  });

  // Handle Logout
  logoutBtn.addEventListener('click', () => {
    token = null;
    localStorage.removeItem('adminToken');
    showLogin();
  });

  // Fetch Items
  async function fetchItems() {
    try {
      const res = await fetch('/api/items');
      const items = await res.json();
      renderItems(items);
    } catch (err) {
      console.error('Error fetching items:', err);
      const imagesGrid = document.getElementById('images-grid');
      const videosGrid = document.getElementById('videos-grid');
      if (imagesGrid) imagesGrid.innerHTML = '<p class="error">Failed to load items.</p>';
      if (videosGrid) videosGrid.innerHTML = '<p class="error">Failed to load items.</p>';
    }
  }

  function renderItems(items) {
    // Sort items by order so it aligns with the UI logic
    items.sort((a, b) => (a.order || 0) - (b.order || 0)); // Descending order: highest order first

    const imagesGrid = document.getElementById('images-grid');
    const videosGrid = document.getElementById('videos-grid');

    imagesGrid.innerHTML = '';
    videosGrid.innerHTML = '';

    if (items.length === 0) {
      imagesGrid.innerHTML = '<p>No images found. Upload one to get started!</p>';
      videosGrid.innerHTML = '<p>No videos found.</p>';
      return;
    }

    let hasImages = false;
    let hasVideos = false;

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        ${item.type === 'video' ? `
          <div style="position: relative; overflow: hidden; border-radius: 8px 8px 0 0;">
            <video src="${item.image_url}" class="item-img" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
            <div class="play-icon-overlay" style="top: 50%; left: 50%; transform: translate(-50%, -50%);"><i class="fas fa-play"></i></div>
          </div>` : `<img src="${item.image_url}" alt="${item.title}" class="item-img" loading="lazy">`}
        <div class="item-info">
          <h4 class="item-title">${item.title} <small style="opacity: 0.7; font-weight: normal; font-size: 0.8em;">(Order: ${item.order || 0})</small></h4>
        </div>
        <div class="item-edit-form" id="edit-form-${item.id}" style="padding: 1rem; border-top: 1px solid var(--border); display: none; flex-direction: column; gap: 0.5rem;">
          <input type="text" id="edit-title-${item.id}" value="${item.title}" style="padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" placeholder="Title" />
          <input type="number" id="edit-order-${item.id}" value="${item.order || 0}" style="padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" placeholder="Sort Order" />
          <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
            <button class="save-edit-btn cta primary" data-id="${item.id}" style="flex: 1; padding: 0.5rem; border: none; cursor: pointer; border-radius: 4px; border: 2px solid var(--accent); background: var(--accent); color: white;">Save</button>
            <button class="cancel-edit-btn cta secondary" data-id="${item.id}" style="flex: 1; padding: 0.5rem; border: none; cursor: pointer; border-radius: 4px; background: transparent; color: var(--accent3); border: 2px solid var(--accent3);">Cancel</button>
          </div>
        </div>
        <div class="item-actions" id="actions-${item.id}">
          <button class="edit-btn" data-id="${item.id}" data-title="${item.title}" data-order="${item.order || 0}"><i class="fas fa-edit"></i> Edit</button>
          <button class="delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i> Delete</button>
        </div>
      `;

      if (item.type === 'video') {
        videosGrid.appendChild(card);
        hasVideos = true;
      } else {
        imagesGrid.appendChild(card);
        hasImages = true;
      }
    });

    if (!hasImages) imagesGrid.innerHTML = '<p>No images found.</p>';
    if (!hasVideos) videosGrid.innerHTML = '<p>No videos found.</p>';

    // Add action listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDelete);
    });

    // Toggle edit forms
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.edit-btn').getAttribute('data-id');
        document.getElementById(`edit-form-${id}`).style.display = 'flex';
        document.getElementById(`actions-${id}`).style.display = 'none';
      });
    });

    document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.cancel-edit-btn').getAttribute('data-id');
        document.getElementById(`edit-form-${id}`).style.display = 'none';
        document.getElementById(`actions-${id}`).style.display = 'flex';
      });
    });

    document.querySelectorAll('.save-edit-btn').forEach(btn => {
      btn.addEventListener('click', handleSaveEdit);
    });
  }

  // Handle Edit Save
  async function handleSaveEdit(e) {
    const btn = e.target.closest('.save-edit-btn');
    const id = btn.getAttribute('data-id');

    const newTitle = document.getElementById(`edit-title-${id}`).value.trim();
    const newOrderStr = document.getElementById(`edit-order-${id}`).value.trim();

    if (!newTitle) {
      alert('Title is required');
      return;
    }

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle, order: parseInt(newOrderStr, 10) || 0 })
      });

      if (res.ok) {
        fetchItems();
      } else if (res.status === 401) {
        alert('Session expired or invalid token. Please log in again.');
        logoutBtn.click();
      } else {
        const data = await res.json();
        alert('Failed to update: ' + (data.error || 'Unknown error'));
        btn.disabled = false;
        btn.innerHTML = 'Save';
      }
    } catch (err) {
      alert('Network error');
      btn.disabled = false;
      btn.innerHTML = 'Save';
    }
  }

  // Handle Delete
  async function handleDelete(e) {
    const btn = e.target.closest('.delete-btn');
    const id = btn.getAttribute('data-id');

    if (!confirm('Are you sure you want to delete this item?')) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchItems();
      } else if (res.status === 401) {
        alert('Session expired or invalid token. Please log in again.');
        logoutBtn.click();
      } else {
        const data = await res.json();
        alert('Failed to delete: ' + (data.error || 'Unknown error'));
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i> Delete';
      }
    } catch (err) {
      alert('Network error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    }
  }

  // Handle Upload
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById('art-title');
    const imageInput = document.getElementById('art-image');
    const orderInput = document.getElementById('art-order');

    if (!imageInput.files[0]) return;

    const formData = new FormData();
    formData.append('title', titleInput.value);
    formData.append('image', imageInput.files[0]);
    if (orderInput && orderInput.value) {
      formData.append('order', orderInput.value);
    }

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        uploadForm.reset();
        fetchItems();
      } else if (res.status === 401) {
        alert('Session expired or invalid token. Please log in again.');
        logoutBtn.click();
      } else {
        const data = await res.json();
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error during upload');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = 'Upload to R2';
    }
  });

  // Handle Sync
  syncBtn.addEventListener('click', async () => {
    if (!confirm('This will scan the R2 bucket and add missing items to the database. Continue?')) return;

    syncBtn.disabled = true;
    const originalText = syncBtn.innerHTML;
    syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Sync complete! Added ${data.added} new item(s).`);
        fetchItems();
      } else if (res.status === 401) {
        alert('Session expired or invalid token. Please log in again.');
        logoutBtn.click();
      } else {
        alert('Sync failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error during sync');
    } finally {
      syncBtn.disabled = false;
      syncBtn.innerHTML = originalText;
    }
  });

});
