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
        item: Item
    };

    readonly tabAttributes = ItemTabAttributes;
    readonly tabImages = ItemTabImages;
    readonly tabMeasures =ItemTabMeasures;
    readonly tabSpecs = ItemTabSpecs;

    constructor(params: NavParams) {
        this.params = {
            item: params.get("item")
        };
    }
}
