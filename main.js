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

  // Create window (hidden)
  createWindow();

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
          win.hide();
        } else {
          // Center window on primary display
          const display = require('electron').screen.getPrimaryDisplay();
          const { width: screenWidth, height: screenHeight } = display.workArea;
          const winWidth = 400;
          const winHeight = 60;
          const x = Math.round((screenWidth - winWidth) / 2);
          const y = Math.round((screenHeight - winHeight) / 2);
          win.setBounds({ x, y, width: winWidth, height: winHeight });
          win.show();
          win.focus();
          // Focus the textarea
          win.webContents.executeJavaScript('document.getElementById("note").focus()');
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
  globalShortcut.unregisterAll();
});