import _ from "lodash";

import { Component } from "@angular/core";
import { NavParams } from "ionic-angular";

import { ItemTabAttributes } from "./tab_attributes";
import { ItemTabImages } from "./tab_images";
import { ItemTabMeasures } from "./tab_measures";
import { ItemTabSpecs } from "./tab_specs";
import { Item } from "../../../providers/model/lineup/item";

@Component({
    selector: "lineup-item-page",
    templateUrl: "item.html"
})
export class ItemPage {
    readonly params: {
        item: Item,
        write: () => Promise<void>
    };

    readonly tabAttributes = ItemTabAttributes;
    readonly tabImages = ItemTabImages;
    readonly tabMeasures =ItemTabMeasures;
    readonly tabSpecs = ItemTabSpecs;

    constructor(params: NavParams) {
        const item = params.get("item");
        const initialKey = item.key;
        this.params = {
            item: item,
            write: async () => {
                const savings = [item.writeInfo()];
                if (!_.isEqual(initialKey, item.key)) {
                    savings.push(item.itemGroup.writeNames());
                }
                await Promise.all(savings);
            }
        };
    }
}
