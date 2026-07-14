const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let win = null;

// Slots persistence
const SLOTS_FILE = path.join(app.getPath('userData'), 'slots.json');
const NUM_SLOTS = 3;
let slots = [];
let currentSlot = 0;
let saveTimeout = null;
function hideWindow() {
  if (win) {
    resetSlot0();
    win.hide();
  }
}

function pinToCorner(corner) {
  if (!win) return;
  const { screen } = require('electron');
  const display = screen.getDisplayMatching(win.getBounds());
  const { x: screenX, y: screenY, width: screenW, height: screenH } = display.workArea;
  const winBounds = win.getBounds();
  const winW = winBounds.width;
  const winH = winBounds.height;
  let newX, newY;
  switch (corner) {
    case 'top-left':
      newX = screenX;
      newY = screenY;
      break;
    case 'top-right':
      newX = screenX + screenW - winW;
      newY = screenY;
      break;
    case 'top-center':
      newX = screenX + Math.round((screenW - winW) / 2);
      newY = screenY;
      break;
    case 'bottom-center':
      newX = screenX + Math.round((screenW - winW) / 2);
      newY = screenY + screenH - winH;
      break;
    default:
      return;
  }
  win.setBounds({ x: newX, y: newY });
}

async function loadSlots() {
  try {
    const data = await fs.readFile(SLOTS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length === NUM_SLOTS) {
      slots = parsed.map(s => typeof s === 'string' ? s : '');
    } else {
      slots = Array(NUM_SLOTS).fill('');
    }
  } catch (err) {
    // No file or error -> start with empty slots
    slots = Array(NUM_SLOTS).fill('');
  }
}

async function saveSlots() {
  try {
    await fs.writeFile(SLOTS_FILE, JSON.stringify(slots, null, 2));
  } catch (err) {
    console.error('Failed to save slots:', err);
  }
}

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveSlots, 500); // debounce 500ms
}
function resetSlot0() {
  slots[0] = '';
  scheduleSave();
}

// Theme persistence
const THEME_FILE = path.join(app.getPath('userData'), 'theme.json');
let currentTheme = 'dark'; // default

async function loadTheme() {
  try {
    const data = await fs.readFile(THEME_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (parsed && (parsed.theme === 'dark' || parsed.theme === 'light')) {
      currentTheme = parsed.theme;
    } else {
      currentTheme = 'dark';
    }
  } catch (err) {
    // No file or error -> default dark
    currentTheme = 'dark';
  }
}

async function saveTheme() {
  try {
    await fs.writeFile(THEME_FILE, JSON.stringify({ theme: currentTheme }, null, 2));
  } catch (err) {
    console.error('Failed to save theme:', err);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 400,
    height: 60,
    minWidth: 300,
    maxWidth: 800,
    frame: false,
    transparent: true,
    hasShadow: true,
    skipTaskbar: true, // hide from taskbar on Windows/Linux
    alwaysOnTop: true,
    focusable: true,
    show: false, // start hidden
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Hide from dock on macOS
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  win.loadFile(path.join(__dirname, 'index.html'));

  // Hide window when it loses focus
  win.on('blur', () => {
    // Save current note before hiding
    if (win) {
      win.webContents.executeJavaScript('document.getElementById("note").value')
        .then(text => {
          slots[currentSlot] = text;
          scheduleSave();
        })
        .catch(console.error);
    }
    hideWindow();
  });

  // Optional: hide on Escape
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      hideWindow();
    }
  });

  // Register theme shortcuts when window is focused, unregister when blurred
  win.on('focus', () => {
    globalShortcut.register('CommandOrControl+L', () => {
      if (win) {
        currentTheme = 'light';
        saveTheme();
        win.webContents.send('switch-theme', currentTheme);
      }
    });
    globalShortcut.register('CommandOrControl+D', () => {
      if (win) {
        currentTheme = 'dark';
        saveTheme();
        win.webContents.send('switch-theme', currentTheme);
      }
    });
    // Pin-to-corner shortcuts
    globalShortcut.register('CommandOrControl+Shift+Left', () => {
      pinToCorner('top-left');
    });
    globalShortcut.register('CommandOrControl+Shift+Right', () => {
      pinToCorner('top-right');
    });
    globalShortcut.register('CommandOrControl+Shift+Up', () => {
      pinToCorner('top-center');
    });
    globalShortcut.register('CommandOrControl+Shift+Down', () => {
      pinToCorner('bottom-center');
    });
  });

  win.on('blur', () => {
    globalShortcut.unregister('CommandOrControl+L');
    globalShortcut.unregister('CommandOrControl+D');
    globalShortcut.unregister('CommandOrControl+Shift+Left');
    globalShortcut.unregister('CommandOrControl+Shift+Right');
    globalShortcut.unregister('CommandOrControl+Shift+Up');
    globalShortcut.unregister('CommandOrControl+Shift+Down');
  });
}

app.whenReady().then(async () => {
  // Load persisted slots and theme
  await loadSlots();
  await loadTheme();

  // IPC handlers for clipboard
  console.log('Setting up IPC handlers');
  ipcMain.handle('clipboard-write-text', (event, text) => {
    console.log('clipboard-write-text called with:', text);
    require('electron').clipboard.writeText(text);
    return Promise.resolve();
  });

  ipcMain.handle('clipboard-read-text', async () => {
    console.log('clipboard-read-text called');
    const text = require('electron').clipboard.readText();
    console.log('clipboard-read-text returning:', text);
    return Promise.resolve(text);
  });

  // IPC handlers for notes/slots
  ipcMain.handle('get-note', () => slots[currentSlot]);
  ipcMain.handle('update-note', (event, text) => {
    slots[currentSlot] = text;
    scheduleSave();
  });
  ipcMain.handle('set-slot', (event, index) => {
    const idx = Math.max(0, Math.min(NUM_SLOTS - 1, Number(index)));
    if (idx !== currentSlot) {
      currentSlot = idx;
      scheduleSave();
    }
    return slots[currentSlot];
  });
  ipcMain.handle('get-slots', () => slots.slice());

  // IPC handlers for theme (kept for possible external use)
  ipcMain.handle('get-theme', () => currentTheme);
  ipcMain.handle('set-theme', (event, theme) => {
    if (theme === 'dark' || theme === 'light') {
      currentTheme = theme;
      saveTheme();
      // Notify renderer to update UI
      if (win) {
        win.webContents.send('switch-theme', currentTheme);
      }
    }
    return currentTheme;
  });

  // IPC handler for pinning window to screen corner/edge
  ipcMain.handle('pin-to-corner', (event, corner) => {
    pinToCorner(corner);
  });

  // IPC handler for saving note as text file
  ipcMain.handle('save-note-as-text', async (event, text) => {
    if (!text || text.trim() === '') {
      return null;
    }

    const { dialog } = require('electron');
    const timestamp = Date.now();
    const defaultName = `togen-note-${timestamp}.txt`;

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Note',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      buttonLabel: 'Save',
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return null;
    }

    try {
      await fs.writeFile(filePath, text, 'utf8');
      return filePath;
    } catch (err) {
      console.error('Failed to save note:', err);
      return null;
    }
  });

  // Create window (hidden)
  createWindow();

  // After window creates, send initial theme
  win.once('ready-to-show', () => {
    win.webContents.send('switch-theme', currentTheme);
  });

  // Try to register global shortcut for Ctrl + Backtick (`)
  const shortcutsToTry = [
    'Ctrl+`',
    'CommandOrControl+`',
    'Ctrl+Backtick',
    'CommandOrControl+Backtick',
    'Ctrl+Backquote',
    'CommandOrControl+Backquote'
  ];

  let registered = false;
  for (const shortcut of shortcutsToTry) {
    console.log('Attempting to register shortcut:', shortcut);
    const ret = globalShortcut.register(shortcut, () => {
      console.log('Shortcut triggered! (via', shortcut + ')');
      if (win) {
        if (win.isVisible()) {
          hideWindow();
          resetSlot0();
        } else {
          currentSlot = 0;
          resetSlot0();
          // Center window on primary display
          const display = require('electron').screen.getPrimaryDisplay();
          const { width: screenWidth, height: screenHeight } = display.workArea;
          const winWidth = 400;
          const winHeight = 60;
          const x = Math.round((screenWidth - winWidth) / 2);
          const y = Math.round((screenHeight - winHeight) / 2);
          win.setBounds({ x, y, width: winWidth, height: winHeight });
          win.show();
          // Clear note (slot0 already cleared)
          win.webContents.executeJavaScript('document.getElementById("note").value = "";')
            .then(() => {
              win.focus();
              return win.webContents.executeJavaScript('document.getElementById("note").focus()');
            })
            .catch(console.error);
        }
      }
    });

    if (ret) {
      console.log('Shortcut registered successfully:', shortcut);
      registered = true;
      break; // stop trying others
    } else {
      console.error('Failed to register shortcut:', shortcut);
    }
  }

  // Register slot-switch shortcuts Ctrl+1, Ctrl+2, Ctrl+3 (etc.)
  for (let i = 1; i <= NUM_SLOTS; i++) {
    const shortcut = `CommandOrControl+${i}`; // works on all platforms
    const ret = globalShortcut.register(shortcut, () => {
      console.log(`Slot switch shortcut triggered: ${shortcut}`);
      const idx = i - 1;
      if (idx !== currentSlot) {
        currentSlot = idx;
        scheduleSave();
      }
      // If window is visible, update its content
      if (win && win.isVisible()) {
        win.webContents.executeJavaScript(`document.getElementById("note").value = '${slots[currentSlot].replace(/'/g, "\\'")}';`)
          .then(() => {
            win.focus();
            return win.webContents.executeJavaScript('document.getElementById("note").focus()');
          })
          .catch(console.error);
      }
    });
    if (!ret) {
      console.error(`Failed to register slot shortcut: ${shortcut}`);
    }
  }

  if (!registered) {
    console.error('Could not register any shortcut for Ctrl+Backtick');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Ensure final save before quitting
  if (saveTimeout) clearTimeout(saveTimeout);
  saveSlots().catch(console.error);
  saveTheme().catch(console.error);
  globalShortcut.unregisterAll();
});