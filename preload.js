const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard-write-text', text),
    readText: () => ipcRenderer.invoke('clipboard-read-text')
  }
});