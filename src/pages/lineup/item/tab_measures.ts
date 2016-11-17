import { Component } from "@angular/core";
import { NavController, NavParams, reorderArray } from "ionic-angular";

import { Item } from "../../../providers/model/lineup/item";
import { MeasurePage } from "../measure";
import { Measure } from "../../../providers/model/lineup/measure";

@Component({
    selector: "item-tab_measures",
    templateUrl: 'tab_measures.html'
})
export class ItemTabMeasures {
    readonly item: Item;

    constructor(private nav: NavController, params: NavParams) {
        this.item = params.get("item");
    }

    get title(): string {
        return this.item.name;
    }

    open(measure: Measure) {
        this.nav.push(MeasurePage, {
            measure: measure
        });
    }

    async addNew() {
        this.open(await this.item.createMeasure());
    }

    reorder(indexes) {
        this.item.measurements = reorderArray(this.item.measurements, indexes);
    }

    async write(): Promise<void> {
        await this.item.writeInfo();
    }
}
