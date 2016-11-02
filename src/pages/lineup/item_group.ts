import _ from "lodash";
import {Component} from "@angular/core";
import {NavController} from "ionic-angular";

import {ItemPage} from "./item";
import {LineupController} from "../../providers/model/lineup/lineup";
import {ItemGroup, Item} from "../../providers/model/lineup/item";
import {Logger} from "../../providers/util/logging";

const logger = new Logger("ItemGroupPage");

@Component({
    templateUrl: 'item_group.html'
})
export class ItemGroupPage {
    static title = "ラインナップ";
    static icon = "filing";
    title = ItemGroupPage.title;
    itemGroup: ItemGroup;

    constructor(private nav: NavController, lineupCtrl: LineupController) {
        ItemGroup.byAll(lineupCtrl).then((v) => {
            this.itemGroup = v;
        });
    }

    get isReady(): boolean {
        return !_.isNil(this.itemGroup);
    }

    async write(): Promise<void> {
        await Promise.all(this.itemGroup.availables.map((a) => a.writeInfo()));
    }

    open(item: Item) {
        logger.debug(() => `Opening lineup: ${item.name}`);
        this.nav.push(ItemPage, {
            item: item
        });
    }

    async addNew() {
        this.open(await this.itemGroup.createNew());
    }
}
