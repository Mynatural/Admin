import { Component } from "@angular/core";
import { NavParams } from "ionic-angular";

import Info from "../../providers/model/lineup/_info.d";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("CategoriesTabSingle");

@Component({
    selector: "categories-tab_single",
    templateUrl: 'tab_single.html'
})
export class CategoriesTabSingle {
    readonly title: string;
    readonly save: any;
    category: Info.Category;

    constructor(params: NavParams) {
        logger.debug(() => `Creating tab by data: ${params.data}`);

        this.title = params.get("title");
        this.save = params.get("save");

        params.get("feature").then((v) => {
            this.category = v;
        });
    }

    async write() {
        await this.save(this.category);
    }
}
