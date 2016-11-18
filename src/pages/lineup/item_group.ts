import _ from "lodash";
import { Component } from "@angular/core";
import { NavController, LoadingController, reorderArray } from "ionic-angular";

import { ItemPage } from "./item/item";
import { LineupController } from "../../providers/model/lineup/lineup";
import { ItemGroup, Item } from "../../providers/model/lineup/item";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("ItemGroupPage");

@Component({
    selector: "lineup-item_group-page",
    templateUrl: "item_group.html"
})
export class ItemGroupPage {
    static title = "ラインナップ";
    static icon = "filing";
    title = ItemGroupPage.title;
    itemGroup: ItemGroup;

    constructor(private nav: NavController, loadingCtrl: LoadingController, lineupCtrl: LineupController) {
        const loading = loadingCtrl.create({
            content: "Loading..."
        });
        loading.present();

        ItemGroup.byAll(lineupCtrl).then((v) => {
            this.itemGroup = v;
            loading.dismiss();
        });
    }

    get isReady(): boolean {
        return !_.isNil(this.itemGroup);
    }

    async write(): Promise<void> {
        await this.itemGroup.writeAll();
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

    reorder(indexes) {
        this.itemGroup.availables = reorderArray(this.itemGroup.availables, indexes);
    }
}
