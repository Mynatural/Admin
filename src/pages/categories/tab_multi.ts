import { Component } from "@angular/core";
import { NavParams } from "ionic-angular";

import Info from "../../providers/model/lineup/_info.d";
import { Category } from "../../providers/model/lineup/category";
import { EditableMap } from "../../providers/util/editable_map";
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

    reordering = true;

    constructor(params: NavParams) {
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

    write() {
        this.save(this.categories);
    }
}
