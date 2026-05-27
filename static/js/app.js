document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    
    const emailListView = document.getElementById('email-list-view');
    const emailDetailView = document.getElementById('email-detail-view');
    
    const emailList = document.getElementById('email-list');
    const refreshBtn = document.getElementById('refresh-btn');
    const searchInput = document.getElementById('search-input');
    
    const backToInboxBtn = document.getElementById('back-to-inbox');
    const detailSubject = document.getElementById('detail-subject');
    const detailFrom = document.getElementById('detail-from');
    const detailAvatar = document.getElementById('detail-avatar');
    const detailDate = document.getElementById('detail-date');
    const detailIframe = document.getElementById('detail-iframe');
    const detailStarBtn = document.getElementById('detail-star-btn');
    const detailUnreadBtn = document.getElementById('detail-unread-btn');
    
    const composeModal = document.getElementById('compose-modal');
    const composeBtn = document.getElementById('compose-btn');
    const closeComposeBtn = document.getElementById('close-compose');
    const composeForm = document.getElementById('compose-form');
    const sendBtn = document.getElementById('send-btn');
    
    const logoutBtn = document.getElementById('logout-btn');
    const deleteBtn = document.getElementById('delete-btn');
    
    let emailsData = [];
    let currentEmailId = null;
    let currentFolder = 'inbox';
    const folderNames = {
        'inbox': 'Inbox',
        'starred': 'Starred',
        'sent': 'Sent Mail',
        'trash': 'Trash'
    };

    // --- Notifications ---
    function showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = message;
        container.appendChild(notif);
        
        setTimeout(() => {
            notif.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => notif.remove(), 300);
        }, 4000);
    }

    // --- Login ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            showNotification('Please enter both email and password', 'error');
            return;
        }
        
        const originalText = loginBtn.textContent;
        loginBtn.textContent = 'Signing in...';
        loginBtn.disabled = true;
        
        try {
            const data = await window.pywebview.api.login(email, password);
            
            if (data.success) {
                showNotification('Successfully logged in!', 'success');
                switchMainView(appView);
                loadEmails();
            } else {
                showNotification(data.message || 'Login failed', 'error');
            }
        } catch (err) {
            showNotification('Error connecting to server', 'error');
        } finally {
            loginBtn.textContent = originalText;
            loginBtn.disabled = false;
        }
    });

    // --- Load Emails ---
    async function loadEmails() {
        emailList.innerHTML = `
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
        `;
        showPanel('list');
        
        try {
            const data = await window.pywebview.api.get_emails(currentFolder);
            
            if (data.success) {
                emailsData = data.emails;
                renderEmailList();
                showNotification(`${folderNames[currentFolder]} updated`, 'info');
            } else {
                showNotification(data.message || 'Failed to fetch emails', 'error');
            }
        } catch (err) {
            showNotification('Error fetching emails', 'error');
            emailList.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-secondary)">Error loading emails.</div>';
        }
    }
    
    function renderEmailList(filterText = '') {
        emailList.innerHTML = '';
        
        const filteredEmails = emailsData.filter(e => 
            e.subject.toLowerCase().includes(filterText) || 
            e.from.toLowerCase().includes(filterText)
        );

        if (filteredEmails.length === 0) {
            emailList.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-secondary)">No emails found in ${folderNames[currentFolder]}.</div>`;
            return;
        }
        
        filteredEmails.forEach((email) => {
            const senderName = email.from.split('<')[0].trim() || email.from;
            const initial = senderName.charAt(0).toUpperCase();
            const color = getAvatarColor(initial);

            const div = document.createElement('div');
            div.className = `email-item ${email.unread ? 'unread' : ''}`;
            div.setAttribute('data-id', email.id);
            div.innerHTML = `
                <div class="email-item-star ${email.starred ? 'starred' : ''}" title="${email.starred ? 'Unstar' : 'Star'}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                <div class="email-item-avatar" style="background-color: ${color}">${initial}</div>
                <div class="email-item-content">
                    <div class="email-sender">
                        <span>${escapeHTML(senderName)}</span>
                        <span class="email-date">${formatDate(email.date)}</span>
                    </div>
                    <div class="email-subject">${escapeHTML(email.subject)}</div>
                </div>
            `;

            // Star toggle listener in list view
            const starBtn = div.querySelector('.email-item-star');
            starBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // prevent opening details view
                const newStarredState = !email.starred;
                try {
                    const res = await window.pywebview.api.toggle_star_email(email.id, currentFolder, newStarredState);
                    if (res.success) {
                        email.starred = newStarredState;
                        starBtn.classList.toggle('starred', newStarredState);
                        starBtn.title = newStarredState ? 'Unstar' : 'Star';
                        showNotification(newStarredState ? 'Email starred' : 'Email unstarred', 'success');
                        
                        // If we are currently in Starred folder, remove from list if unstarred
                        if (currentFolder === 'starred' && !newStarredState) {
                            emailsData = emailsData.filter(item => item.id !== email.id);
                            renderEmailList(searchInput.value.toLowerCase().trim());
                        }
                    } else {
                        showNotification('Failed to update star', 'error');
                    }
                } catch (err) {
                    showNotification('Error toggling star', 'error');
                }
            });

            div.addEventListener('click', () => {
                showEmailDetail(email, senderName, initial, color);
            });
            emailList.appendChild(div);
        });
    }

    searchInput.addEventListener('input', (e) => {
        renderEmailList(e.target.value.toLowerCase().trim());
    });

    // --- Details View ---
    function showEmailDetail(email, senderName, initial, color) {
        showPanel('detail');
        currentEmailId = email.id;
        
        detailSubject.textContent = email.subject || '(No Subject)';
        detailFrom.textContent = escapeHTML(senderName);
        detailDate.textContent = formatDateFull(email.date);
        
        detailAvatar.textContent = initial;
        detailAvatar.style.backgroundColor = color;
        
        // Toggle active star state
        detailStarBtn.classList.toggle('starred', email.starred);
        detailStarBtn.title = email.starred ? 'Unstar' : 'Star';
        
        // Auto mark as read if unread
        if (email.unread) {
            window.pywebview.api.mark_as_read(email.id, currentFolder, true)
                .then(res => {
                    if (res.success) {
                        email.unread = false;
                        const el = emailList.querySelector(`.email-item[data-id="${email.id}"]`);
                        if (el) el.classList.remove('unread');
                    }
                })
                .catch(err => console.error("Error marking read:", err));
        }
        
        // Use iframe to render HTML safely with a white background
        const doc = detailIframe.contentWindow.document;
        doc.open();
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; padding: 0; margin: 0; background: white; }
                    a { color: #3b82f6; }
                    img { max-width: 100%; height: auto; }
                    pre { white-space: pre-wrap; font-family: inherit; }
                </style>
            </head>
            <body>
                ${email.body}
            </body>
            </html>
        `;
        doc.write(htmlContent);
        doc.close();
    }

    backToInboxBtn.addEventListener('click', () => {
        showPanel('list');
    });

    // Star Toggle in Detail View
    detailStarBtn.addEventListener('click', async () => {
        if (!currentEmailId) return;
        const email = emailsData.find(e => e.id === currentEmailId);
        if (!email) return;
        
        const newStarredState = !email.starred;
        try {
            const res = await window.pywebview.api.toggle_star_email(currentEmailId, currentFolder, newStarredState);
            if (res.success) {
                email.starred = newStarredState;
                detailStarBtn.classList.toggle('starred', newStarredState);
                detailStarBtn.title = newStarredState ? 'Unstar' : 'Star';
                showNotification(newStarredState ? 'Email starred' : 'Email unstarred', 'success');
                
                // Update in list view as well
                const listStar = emailList.querySelector(`.email-item[data-id="${currentEmailId}"] .email-item-star`);
                if (listStar) {
                    listStar.classList.toggle('starred', newStarredState);
                    listStar.title = newStarredState ? 'Unstar' : 'Star';
                }
                
                // If in starred folder and unstarred, go back to list
                if (currentFolder === 'starred' && !newStarredState) {
                    emailsData = emailsData.filter(item => item.id !== currentEmailId);
                    showPanel('list');
                    renderEmailList(searchInput.value.toLowerCase().trim());
                }
            } else {
                showNotification('Failed to update star state', 'error');
            }
        } catch (err) {
            showNotification('Error updating star state', 'error');
        }
    });

    // Mark as Unread in Detail View
    detailUnreadBtn.addEventListener('click', async () => {
        if (!currentEmailId) return;
        const email = emailsData.find(e => e.id === currentEmailId);
        if (!email) return;
        
        try {
            const res = await window.pywebview.api.mark_as_read(currentEmailId, currentFolder, false);
            if (res.success) {
                email.unread = true;
                showNotification('Email marked as unread', 'success');
                showPanel('list');
                renderEmailList(searchInput.value.toLowerCase().trim());
            } else {
                showNotification('Failed to update read state', 'error');
            }
        } catch (err) {
            showNotification('Error marking as unread', 'error');
        }
    });

    deleteBtn.addEventListener('click', async () => {
        if (!currentEmailId) return;
        if (!confirm('Are you sure you want to delete this email?')) return;
        
        const originalHtml = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
        deleteBtn.disabled = true;
        
        try {
            const data = await window.pywebview.api.delete_email(currentEmailId, currentFolder);
            
            if (data.success) {
                showNotification('Email deleted successfully', 'success');
                showPanel('list');
                loadEmails();
            } else {
                showNotification(data.message || 'Failed to delete email', 'error');
            }
        } catch (err) {
            showNotification('Error deleting email', 'error');
        } finally {
            deleteBtn.innerHTML = originalHtml;
            deleteBtn.disabled = false;
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await window.pywebview.api.logout();
        } catch(e) {}
        
        emailsData = [];
        emailList.innerHTML = '';
        loginForm.reset();
        switchMainView(loginView);
        showNotification('Logged out successfully', 'info');
    });

    // --- Compose ---
    composeBtn.addEventListener('click', () => {
        composeModal.classList.add('active');
        document.getElementById('compose-to').focus();
    });
    
    closeComposeBtn.addEventListener('click', () => {
        composeModal.classList.remove('active');
    });
    
    composeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const to = document.getElementById('compose-to').value.trim();
        const subject = document.getElementById('compose-subject').value.trim();
        const body = document.getElementById('compose-body').value.trim();
        
        if (!to || !body) {
            showNotification('Recipient and body are required', 'error');
            return;
        }
        
        const originalHtml = sendBtn.innerHTML;
        sendBtn.innerHTML = '<span>Sending...</span>';
        sendBtn.disabled = true;
        
        try {
            const data = await window.pywebview.api.send_email(to, subject, body);
            
            if (data.success) {
                showNotification('Email sent successfully!', 'success');
                composeModal.classList.remove('active');
                composeForm.reset();
            } else {
                showNotification(data.message || 'Failed to send email', 'error');
            }
        } catch (err) {
            showNotification('Error connecting to server', 'error');
        } finally {
            sendBtn.innerHTML = originalHtml;
            sendBtn.disabled = false;
        }
    });

    // --- Sidebar Navigation ---
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            currentFolder = item.getAttribute('data-folder');
            document.getElementById('folder-title').textContent = folderNames[currentFolder];
            
            loadEmails();
        });
    });

    // --- Utilities ---
    refreshBtn.addEventListener('click', loadEmails);

    function switchMainView(view) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        view.classList.add('active');
    }

    function showPanel(panelName) {
        if (panelName === 'list') {
            emailListView.classList.remove('hidden');
            emailListView.classList.add('active');
            emailDetailView.classList.add('hidden');
            emailDetailView.classList.remove('active');
        } else {
            emailListView.classList.add('hidden');
            emailListView.classList.remove('active');
            emailDetailView.classList.remove('hidden');
            emailDetailView.classList.add('active');
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr.split(' ')[0] || '';
            const now = new Date();
            if (d.toDateString() === now.toDateString()) {
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch {
            return dateStr.substring(0, 10);
        }
    }

    function formatDateFull(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleString([], { dateStyle: 'long', timeStyle: 'short' });
        } catch {
            return dateStr;
        }
    }

    function getAvatarColor(char) {
        const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185'];
        if (!char) return colors[0];
        const code = char.charCodeAt(0);
        return colors[code % colors.length];
    }
});
