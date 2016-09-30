import {Component, ViewChild, PLATFORM_DIRECTIVES} from '@angular/core';
import {App, ionicBootstrap, Platform, Nav} from 'ionic-angular';
import {CUSTOM_ICON_DIRECTIVES} from 'ionic2-custom-icons';

import {FATHENS_DIRECTIVES} from "./components/all";
import {FATHENS_PROVIDERS} from "./providers/all";
import {Credentials} from "./providers/config/credentials";
import {HomePage} from './pages/home/home';
import {LineupPage} from './pages/lineup/lineup';
import {Logger} from "./util/logging";

const logger = new Logger("App");

@Component({
    templateUrl: "build/app.html"
})
export class MyApp {
    @ViewChild(Nav) nav: Nav;

    rootPage: any = HomePage;
    pages = [HomePage, LineupPage];
    menuTitle = "もくじ";

    isDevel: boolean = false;

    constructor(private app: App, private cred: Credentials, platform: Platform) {
        platform.ready().then(async () => {
            logger.info(() => `Launched.`);
        });
    }

    get username(): string {
        return this.cred.username;
    }

    openPage(page) {
        this.nav.setRoot(page);
    }
}

ionicBootstrap(MyApp, [
    FATHENS_PROVIDERS,
    {
        provide: PLATFORM_DIRECTIVES,
        useValue: [CUSTOM_ICON_DIRECTIVES, FATHENS_DIRECTIVES],
        multi: true
    }
]);
