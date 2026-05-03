const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pmAPI', {
  /** 搜索包 */
  search: (pmKey, query, paths) => ipcRenderer.invoke('pm-search', pmKey, query, paths),

  /** 获取包详情 */
  info: (pmKey, packageName, paths) => ipcRenderer.invoke('pm-info', pmKey, packageName, paths),

  /** 获取已安装列表 */
  list: (pmKey, paths) => ipcRenderer.invoke('pm-list', pmKey, paths),

  /** 安装包（实时日志流） */
  install: (pmKey, packageName, channelId, paths) =>
    ipcRenderer.send('pm-install', { pmKey, packageName, channelId, paths }),

  /** 卸载包（实时日志流） */
  uninstall: (pmKey, packageName, channelId, paths) =>
    ipcRenderer.send('pm-uninstall', { pmKey, packageName, channelId, paths }),

  /** 终止运行中的命令 */
  kill: (channelId) => ipcRenderer.send('pm-kill', channelId),

  /** 监听安装/卸载输出 */
  onCmdStdout: (channelId, callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(`cmd-stdout-${channelId}`, handler);
    return () => ipcRenderer.removeListener(`cmd-stdout-${channelId}`, handler);
  },

  onCmdStderr: (channelId, callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on(`cmd-stderr-${channelId}`, handler);
    return () => ipcRenderer.removeListener(`cmd-stderr-${channelId}`, handler);
  },

  onCmdDone: (channelId, callback) => {
    const handler = (_event, code) => callback(code);
    ipcRenderer.on(`cmd-done-${channelId}`, handler);
    return () => ipcRenderer.removeListener(`cmd-done-${channelId}`, handler);
  },

  onCmdError: (channelId, callback) => {
    const handler = (_event, error) => callback(error);
    ipcRenderer.on(`cmd-error-${channelId}`, handler);
    return () => ipcRenderer.removeListener(`cmd-error-${channelId}`, handler);
  },
});
