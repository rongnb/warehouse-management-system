const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wmManager', {
  startServices: () => ipcRenderer.invoke('start-services'),
  stopServices: () => ipcRenderer.invoke('stop-services'),
  resetPassword: () => ipcRenderer.invoke('reset-password'),
  checkStatus: () => ipcRenderer.invoke('check-status'),

  onCommandOutput: (callback) => {
    ipcRenderer.on('command-output', (_, text) => callback(text));
  },

  onCommandComplete: (callback) => {
    ipcRenderer.on('command-complete', (_, code) => callback(code));
  }
});
