import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController} from "ionic-angular";

import {ItemPage} from "./item";
import {LineupController} from "../../providers/model/lineup/lineup";
import {ItemGroup, Item} from "../../providers/model/lineup/item";
import {Logger} from "../../util/logging";

const logger = new Logger("ItemGroupPage");

@Component({
    templateUrl: 'build/pages/lineup/item_group.html'
})
export class ItemGroupPage {
    static title = "ラインナップ";
    static icon = "filing";
    title = ItemGroupPage.title;
    lineup: ItemGroup;

    constructor(private nav: NavController, lineupCtrl: LineupController) {
        lineupCtrl.lineup.then((v) => {
            this.lineup = v;
        });
    }

    get isReady(): boolean {
        return !_.isNil(this.lineup);
    }

    async write(): Promise<void> {
        await Promise.all(this.lineup.availables.map((a) => a.writeInfo()));
    }

    open(item: Item) {
        logger.debug(() => `Opening lineup: ${item.info.name}`);
        this.nav.push(ItemPage, {
            item: item
        });
    }

    addNew() {
        this.open(this.lineup.createNew());
    }
}
