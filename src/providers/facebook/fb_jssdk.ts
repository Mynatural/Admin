import _ from "lodash";
import { Injectable } from "@angular/core";
import { Http } from "@angular/http";

import { FBConnectPlugin, FBConnectToken } from "./fb.d";
import { BootSettings } from "../config/boot_settings";
import { Logger } from "../util/logging";

const logger = new Logger("FBJSSDK");

const invokeInterval = 1000; // 1 second;
let lastInvoked: Promise<void>;

@Injectable()
export class FBJSSDK implements FBConnectPlugin {
    constructor(private http: Http, private settings: BootSettings) { }

    private async initialize(): Promise<void> {
        const scriptId = "facebook-jssdk";
        if (!_.isNil(document.getElementById(scriptId))) return;

        const appId = await this.settings.facebookAppId;
        logger.debug(() => `Setting browser facebook app id: ${appId}`);

        const script = document.createElement("script") as HTMLScriptElement;
        script.id = scriptId;
        script.src = "https://connect.facebook.net/en_US/sdk.js";

        return new Promise<void>((resolve, reject) => {
            (window as any).fbAsyncInit = () => {
                try {
                    (window as any).FB.init({
                        appId: appId,
                        xfbml: false,
                        version: "v2.5"
                    });
                    resolve();
                } catch (ex) {
                    reject(ex);
                }
            };
            const first = document.getElementsByTagName("script")[0];
            first.parentNode.insertBefore(script, first);
        });
    }

    private async invoke<T>(proc: (fb: FBJSSDKPlugin, callback: (result: T) => void) => void) {
        if (!_.isNil(lastInvoked)) {
            logger.debug(() => `Waiting previous invoke...`);
            await lastInvoked;
            logger.debug(() => `Release from previous invoke.`);
        }
        lastInvoked = new Promise<void>((resolve, reject) => {
            setTimeout(resolve, invokeInterval);
            logger.debug(() => `Release this invoke`);
        });

        await this.initialize();
        return new Promise<T>((resolve, reject) => {
            proc((window as any).FB, resolve);
        });
    }

    login(arg?: string): Promise<string> {
        return this.invoke<string>((fb, callback) => {
            const args = ["public_profile"];
            if (arg) args.push(arg);
            fb.login((res) => {
                callback(res.authResponse ? res.authResponse.accessToken : null);
            }, { scope: args.join(",") });
        });
    }

    logout(): Promise<void> {
        return this.invoke<void>((fb, callback) => {
            fb.logout(callback);
        });
    }

    getName(): Promise<string> {
        return this.invoke<string>((fb, callback) => {
            fb.api("/me", "get", (res) => {
                logger.debug(() => `UserInfo: ${JSON.stringify(res, null, 4)}`);
                callback(res["name"]);
            });
        });
    }

    getToken(): Promise<FBConnectToken> {
        return this.invoke<FBConnectToken>((fb, callback) => {
            fb.getLoginStatus((res) => {
                if (res.status === "connected") {
                    callback({
                        token: res.authResponse.accessToken,
                        permissions: null
                    });
                } else {
                    callback(null);
                }
            });
        });
    }
}

declare type FBJSCallback<T> = (res: T) => void;

interface FBJSSDKPlugin {
    login(callback: FBJSCallback<LoginResponse>, param): void;
    logout(callback: FBJSCallback<void>): void;
    getLoginStatus(callback: FBJSCallback<LoginResponse>): void;
    api(path: string, method: "get" | "post" | "delete", callback: FBJSCallback<LoginResponse>): void;
}

interface LoginResponse {
    authResponse: {
        accessToken: string,
        userID: string,
        expiresIn: number,
        signedRequest: string
    };
    status: string;
}
