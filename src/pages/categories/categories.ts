import _ from "lodash";

import { Component } from "@angular/core";
import { NavController } from "ionic-angular";

import Info from "../../providers/model/lineup/_info.d";
import { Category } from "../../providers/model/lineup/category";
import { S3File } from "../../providers/aws/s3file";
import { EditableMap } from "../../providers/util/editable_map";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("CategoriesPage");

@Component({
    selector: "categories-page",
    templateUrl: 'categories.html'
})
export class CategoriesPage {
    static title = "カテゴリー";
    static icon = "albums";
    readonly title = CategoriesPage.title;

    news: Info.Category;

    categories: EditableMap<Info.Category>;

    constructor(private nav: NavController, private s3file: S3File) {
        this.init();
    }

    private async init() {
        const map = await Category.loadAll(this.s3file);
        const obj = _.mapValues(map.toObject(), (x) => x.asJSON());
        this.categories = new EditableMap<Info.Category>(obj, () => {
            return {
                title: "新カテゴリー",
                message: "",
                flags: {}
            }
        });
        logger.debug(() => `Load ${_.size(this.categories.list)} categories`);

        this.news = (await Category.loadNews(this.s3file)).asJSON();
    }
}
