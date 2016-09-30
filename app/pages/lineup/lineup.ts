import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController} from "ionic-angular";

import {ItemPage} from "./item";
import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("LineupPage");

@Component({
    templateUrl: 'build/pages/lineup/lineup.html'
})
export class LineupPage {
    static title = "ラインナップ";
    static icon = "filing";
    title = LineupPage.title;
    items: Lineup.Item[];

    constructor(private nav: NavController, private lineup: Lineup.Lineup) {
        lineup.all.then((list) => {
            this.items = list;
        });
    }

    get isReady(): boolean {
        return true;
    }

    open(item: Lineup.Item) {
        logger.debug(() => `Opening lineup: ${item.name}`);
        this.nav.push(ItemPage, {
            item: item
        });
    }

    addNew() {
        logger.debug(() => `Adding new...`);
    }
}
