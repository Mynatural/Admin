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
    readonly write: () => Promise<void>;

    constructor(private nav: NavController, params: NavParams) {
        this.item = params.get("item");
        this.write = params.get("write");
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
}
