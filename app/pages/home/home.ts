import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController} from "ionic-angular";

import {Cognito} from "../../providers/aws/cognito";
import {Credentials} from "../../providers/config/credentials";
import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("HomePage");

@Component({
    templateUrl: 'build/pages/home/home.html'
})
export class HomePage {
    static title = "ホーム";
    static icon = "home";
    title = HomePage.title;
    items: Lineup.Item[];
    isJoined = false;

    topMessages = [
        "Mynatural",
        "管理アプリ"
    ];

    constructor(private nav: NavController, private cognito: Cognito, private cred: Credentials) {
        logger.debug(() => `Checking facebook joined...`);
        this.checkAuth();
    }

    async checkAuth() {
        this.isJoined = await this.cred.isAuthorized
    }

    get isReady(): boolean {
        return true;
    }

    async loginFacebook() {
        logger.debug(() => `Login by Facebook.`);
        await this.cognito.joinFacebook();
        this.checkAuth();
    }
}
