const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard-write-text', text),
    readText: () => ipcRenderer.invoke('clipboard-read-text')
  },
  notes: {
    getCurrent: () => ipcRenderer.invoke('get-note'),
    update: (text) => ipcRenderer.invoke('update-note', text),
    setSlot: (index) => ipcRenderer.invoke('set-slot', index),
    getSlots: () => ipcRenderer.invoke('get-slots')
  }
});