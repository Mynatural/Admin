export interface FBConnectPlugin {
    login(arg?: string): Promise<string>;
    logout(): Promise<void>;
    getName(): Promise<string>;
    getToken(): Promise<FBConnectToken>;
}

export type FBConnectToken = {
    token: string,
    permissions: string[]
}
