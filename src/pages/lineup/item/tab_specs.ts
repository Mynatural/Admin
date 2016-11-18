import { Component } from "@angular/core";
import { NavController, NavParams, reorderArray } from "ionic-angular";

import { Item } from "../../../providers/model/lineup/item";
import { SpecGroupPage } from "../spec_group";
import { SpecGroup } from "../../../providers/model/lineup/spec";

@Component({
    selector: "item-tab_specs",
    templateUrl: 'tab_specs.html'
})
export class ItemTabSpecs {
    readonly item: Item;

    constructor(private nav: NavController, params: NavParams) {
        this.item = params.get("item");
    }

    get title(): string {
        return this.item.name;
    }

    openSpec(specGroup: SpecGroup) {
        this.nav.push(SpecGroupPage, {
            specGroup: specGroup
        });
    }

    async addNew() {
        this.openSpec(await this.item.createSpec());
    }

    reorder(indexes) {
        this.item.specGroups = reorderArray(this.item.specGroups, indexes);
    }

    async write(): Promise<void> {
        await this.item.writeInfo();
    }
}
