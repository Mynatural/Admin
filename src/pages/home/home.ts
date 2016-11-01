import _ from "lodash";
import {Component} from "@angular/core";
import {NavController} from "ionic-angular";

import {Credentials} from "../../providers/config/credentials";
import {Logger} from "../../util/logging";

const logger = new Logger("HomePage");

@Component({
    templateUrl: 'home.html'
})
export class HomePage {
    static title = "ホーム";
    static icon = "home";
    title = HomePage.title;

    topMessages = [
        "Mynatural",
        "管理アプリ"
    ];

    constructor(private nav: NavController, private cred: Credentials) {
        logger.debug(() => `Checking facebook joined...`);
    }

    get username(): string {
        return this.cred.username;
    }

    get isReady(): boolean {
        return true;
    }

    async loginFacebook() {
        logger.debug(() => `Login by Facebook.`);
        await this.cred.join();
    }
}
