import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController} from "ionic-angular";

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

    topMessages = [
        "Mynatural",
        "管理アプリ"
    ];

    constructor(public nav: NavController, private lineups: Lineup.Lineup) {
        lineups.all.then((list) => {
            this.items = list;
        });
    }

    get isReady(): boolean {
        return false;
    }
}
