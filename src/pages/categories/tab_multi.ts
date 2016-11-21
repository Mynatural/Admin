import _ from "lodash"

import { Component } from "@angular/core";
import { NavParams } from "ionic-angular";

import Info from "../../providers/model/lineup/_info.d";
import { Category } from "../../providers/model/lineup/category";
import { Prompt } from "../../providers/util/prompt";
import { EditableMap, EditableMapItem } from "../../providers/util/editable_map";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("CategoriesTabMulti");

@Component({
    selector: "categories-tab_multi",
    templateUrl: 'tab_multi.html'
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
