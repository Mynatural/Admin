import { Component, ViewChild, PLATFORM_DIRECTIVES } from '@angular/core';
import { App, ionicBootstrap, Platform, Nav } from 'ionic-angular';
import {CUSTOM_ICON_DIRECTIVES} from 'ionic2-custom-icons';

import {FATHENS_DIRECTIVES} from "./components/all";
import {FATHENS_PROVIDERS} from "./providers/all";
import { HomePage } from './pages/home/home';
import { Logger } from "./util/logging";

@Component({
    templateUrl: "build/app.html"
})
export class MyApp {
    @ViewChild(Nav) nav: Nav;

    rootPage: any = HomePage;
    pages = [HomePage];
    menuTitle = "もくじ";

    isDevel: boolean = false;

    constructor(private app: App, platform: Platform) {
        platform.ready().then(async () => {
        });
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
