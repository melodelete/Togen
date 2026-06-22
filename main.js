const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

let win = null;

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
    win.hide();
  });

  // Optional: hide on Escape
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      win.hide();
    }
  });
}

app.whenReady().then(() => {
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

  // Create window
  createWindow();

  // Register global shortcut Ctrl+Shift+`
  const backtick = '`';
  const shortcut = 'Ctrl+Shift+' + backtick;
  console.log('Registering shortcut:', shortcut);
  const ret = globalShortcut.register(shortcut, () => {
    console.log('Shortcut triggered!');
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        // Position window near cursor? For simplicity, center screen
        const { width, height } = win.getBounds();
        const { x, y } = require('electron').screen.getPrimaryDisplay().workAreaCenter;
        win.setBounds({
          x: x - width / 2,
          y: y - height / 2,
          width,
          height
        });
        win.show();
        win.focus();
        // Focus the textarea
        win.webContents.executeJavaScript('document.getElementById("note").focus()');
      }
    }
  });

  if (!ret) {
    console.error('Failed to register shortcut:', shortcut);
  } else {
    console.log('Shortcut registered successfully:', shortcut);
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
  globalShortcut.unregisterAll();
});