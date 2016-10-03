import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController} from "ionic-angular";

import {ItemPage} from "./item";
import * as Prompt from "./util_prompt";
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
    lineup: Lineup.Lineup;

    constructor(private nav: NavController, lineupCtrl: Lineup.LineupController) {
        lineupCtrl.lineup.then((v) => {
            this.lineup = v;
        });
    }

    get isReady(): boolean {
        return !_.isNil(this.lineup);
    }

    open(item: Lineup.LineupValue) {
        logger.debug(() => `Opening lineup: ${item.info.name}`);
        this.nav.push(ItemPage, {
            item: item
        });
    }

    addNew() {
        this.open(this.lineup.createNew());
    }
}
