import {Injectable} from "@angular/core";

import {FBConnectPlugin, FBConnectToken} from "./fb.d";
import {FBJSSDK} from "./fb_jssdk";

@Injectable()
export class FBConnect {
    constructor(private fbjs: FBJSSDK) {
        this.plugin = fbjs;
    }

    private plugin: FBConnectPlugin;

    login(): Promise<string> {
        return this.plugin.login();
    }

    logout(): Promise<void> {
        return this.plugin.logout();
    }

    grantPublish(): Promise<string> {
        return this.plugin.login("publish_actions");
    }

    getName(): Promise<string> {
        return this.plugin.getName();
    }

    getToken(): Promise<FBConnectToken> {
        return this.plugin.getToken();
    }
}
