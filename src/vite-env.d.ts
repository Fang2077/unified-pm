/// <reference types="vite/client" />

interface Window {
  pmAPI?: {
    search: (pmKey: string, query: string) => Promise<any>;
    info: (pmKey: string, packageName: string) => Promise<any>;
    list: (pmKey: string) => Promise<any>;
    install: (pmKey: string, packageName: string, channelId: string) => void;
    uninstall: (pmKey: string, packageName: string, channelId: string) => void;
    onCmdStdout: (channelId: string, callback: (data: string) => void) => () => void;
    onCmdStderr: (channelId: string, callback: (data: string) => void) => () => void;
    onCmdDone: (channelId: string, callback: (code: number) => void) => () => void;
    onCmdError: (channelId: string, callback: (error: string) => void) => () => void;
  };
}
