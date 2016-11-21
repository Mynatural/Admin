import _ from "lodash"

import { Component,
        trigger,
        state,
        style,
        transition,
        keyframes,
        animate } from "@angular/core";
import { NavParams } from "ionic-angular";

import Info from "../../providers/model/lineup/_info.d";
import { Category } from "../../providers/model/lineup/category";
import { Prompt } from "../../providers/util/prompt";
import { EditableMap, EditableMapItem } from "../../providers/util/editable_map";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("CategoriesTabMulti");

@Component({
    selector: "categories-tab_multi",
    templateUrl: 'tab_multi.html',
    animations: [
        trigger("collapseHead", [
            state("close", style({display: "block"})),
            state("open", style({display: "none"})),
            transition("close => open", [
                animate("0.5s 0.5s ease", keyframes([
                    style({maxHeight: "3rem"}),
                    style({maxHeight: "0"})
                ]))
            ]),
            transition("open => close", [
                animate("0.5s 0s ease", keyframes([
                    style({maxHeight: "0"}),
                    style({maxHeight: "3rem"})
                ]))
            ])
        ]),
        trigger("collapseBody", [
            state("close", style({display: "none"})),
            state("open", style({display: "block"})),
            transition("close => open", [
                animate("0.5s 0s ease", keyframes([
                    style({maxHeight: "0"}),
                    style({maxHeight: "100vh"})
                ]))
            ]),
            transition("open => close", [
                animate("0.5s 0s ease", keyframes([
                    style({maxHeight: "100vh"}),
                    style({maxHeight: "0"})
                ]))
            ])
        ])
    ]
})
export class CategoriesTabMulti {
    readonly title: string;
    readonly save: any;
    categories: EditableMap<Info.Category>;

    editing: string;

    constructor(params: NavParams, private prompt: Prompt) {
        logger.debug(() => `Creating tab by data: ${params.data}`);

        this.title = params.get("title");
        this.save = params.get("save");

        params.get("feature").then(async (v) => {
            this.categories = v;
        });
    }

    isEditing(itemKey: string): boolean {
        return _.isEqual(this.editing, itemKey);
    }

    collapseState(itemKey: string): string {
        return this.isEditing(itemKey) ? "open" : "close";
    }

    reorder(indexes) {
        this.categories.reorder(indexes);
    }

    async write() {
        await this.save(this.categories);
    }

    choose(itemKey: string) {
        if (this.editing && _.isEqual(this.editing, itemKey)) {
            this.editing = null;
        } else {
            this.editing = itemKey;
        }
    }

    async delete(item: EditableMapItem<Info.Category>) {
        if (await this.prompt.confirm(`"${item.key}"を削除します`)) {
            this.categories.remove(item);
        }
    }
}
