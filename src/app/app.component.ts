import { Component, ViewChild } from "@angular/core";
import { Platform, Nav } from "ionic-angular";

import { HomePage } from "../pages/home/home";
import { ItemGroupPage } from '../pages/lineup/item_group';
import { Logger } from "../providers/util/logging";

const logger = new Logger("MyApp");

@Component({
    templateUrl: "app.component.html"
})
export class MyApp {
    @ViewChild(Nav) nav: Nav;

    rootPage: any = HomePage;
    pages = [HomePage, ItemGroupPage];
    menuTitle = "もくじ";

    isDevel: boolean = false;

    constructor(platform: Platform) {
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
