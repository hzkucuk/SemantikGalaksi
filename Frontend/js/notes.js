// ======== WYSIWYG Notes System ========
var _notes = [];
var _activeNoteId = null;
var _noteSaveTimer = null;

var _notesKey = () => 'sgx_notes_' + (authUser || 'guest');

var loadNotes = async () => {
    if (isDesktopMode && authToken) {
        try {
            var r = await authFetch('/api/notes');
            if (r.ok) { _notes = await r.json(); return; }
        } catch(e) {}
    }
    try {
        var raw = localStorage.getItem(_notesKey());
        _notes = raw ? JSON.parse(raw) : [];
    } catch(e) { _notes = []; }
};

var saveNotesToStorage = async () => {
    if (isDesktopMode && authToken) {
        try {
            await authFetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(_notes)
            });
        } catch(e) {}
    }
    localStorage.setItem(_notesKey(), JSON.stringify(_notes));
};

var renderNotesList = () => {
    var sb = document.getElementById('notes-sidebar');
    if (!sb) return;
    sb.innerHTML = _notes.map(n => `
        <div class="note-item ${n.id === _activeNoteId ? 'active' : ''}" onclick="selectNote('${n.id}')">
            <div class="note-title-text">${n.title || t('notes.untitled')}</div>
            <div class="note-date">${new Date(n.updated).toLocaleDateString(I18n.getLanguage() === 'TR-tr' ? 'tr-TR' : I18n.getLanguage().split('-')[0])}</div>
        </div>
    `).join('') || '<div style="padding:16px;font-size:10px;color:#475569;text-align:center;">Henüz not yok.<br>✚ ile yeni ekleyin.</div>';
};

var selectNote = (id) => {
    _activeNoteId = id;
    var note = _notes.find(n => n.id === id);
    if (note) {
        document.getElementById('note-title').value = note.title || '';
        document.getElementById('note-content').innerHTML = note.content || '';
    }
    renderNotesList();
};
window.selectNote = selectNote;

var addNewNote = () => {
    var id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    var note = { id, title: '', content: '', created: new Date().toISOString(), updated: new Date().toISOString() };
    _notes.unshift(note);
    saveNotesToStorage();
    selectNote(id);
};

var deleteCurrentNote = async () => {
    if (!_activeNoteId) return;
    var ok = await showConfirm(t('notes.deleteConfirm'), t('modal.confirm'), { danger: true });
    if (!ok) return;
    var delId = _activeNoteId;
    _notes = _notes.filter(n => n.id !== delId);
    if (isDesktopMode && authToken) {
        try { await authFetch('/api/note/' + encodeURIComponent(delId), { method: 'DELETE' }); } catch(e) {}
    }
    await saveNotesToStorage();
    _activeNoteId = _notes.length > 0 ? _notes[0].id : null;
    if (_activeNoteId) selectNote(_activeNoteId);
    else {
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').innerHTML = '';
    }
    renderNotesList();
};

var autoSaveNote = () => {
    if (!_activeNoteId) return;
    clearTimeout(_noteSaveTimer);
    _noteSaveTimer = setTimeout(() => {
        var note = _notes.find(n => n.id === _activeNoteId);
        if (!note) return;
        note.title = document.getElementById('note-title').value;
        note.content = document.getElementById('note-content').innerHTML;
        note.updated = new Date().toISOString();
        saveNotesToStorage();
        renderNotesList();
    }, 500);
};

var openNotes = async () => {
    await loadNotes();
    if (_notes.length === 0) addNewNote();
    else if (!_activeNoteId) selectNote(_notes[0].id);
    else selectNote(_activeNoteId);
    document.getElementById('notes-overlay').classList.add('show');
};

var closeNotes = () => {
    document.getElementById('notes-overlay').classList.remove('show');
};

var nCmd = (cmd, val) => {
    if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, '<' + val + '>');
    } else if (cmd === 'insertHTML') {
        document.execCommand('insertHTML', false, val);
    } else {
        document.execCommand(cmd, false, null);
    }
    document.getElementById('note-content').focus();
    autoSaveNote();
};
window.nCmd = nCmd;

var insertNoteLink = async () => {
    var url = await showPrompt(t('notes.linkUrlPrompt'), '', t('notes.insertLink'));
    if (url) document.execCommand('createLink', false, url);
    autoSaveNote();
};
window.insertNoteLink = insertNoteLink;

// Notes overlay close on background click
document.addEventListener('click', (e) => {
    if (e.target.id === 'notes-overlay') closeNotes();
});
