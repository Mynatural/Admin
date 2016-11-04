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
        this.loadAll().then((all) => {
            this.categories = new EditableMap<Info.Category>(all, () => {
                return {
                    title: "新カテゴリー",
                    message: "",
                    flags: {}
                }
            });
            logger.debug(() => `Load ${_.size(this.categories.list)} categories`);
        });

        this.loadNews().then((obj) => {
            this.news = obj;
        });
    }

    private async loadNews(): Promise<Info.Category> {
        try {
            const v = await Category.loadNews(this.s3file);
            return v.asJSON();
        } catch (ex) {
            return {
                title: "新作ニュース",
                message: "",
                flags: {}
            }
        }
    }

    private async loadAll(): Promise<Info.Categories> {
        try {
            const map = await Category.loadAll(this.s3file);
            return _.mapValues(map.toObject(), (x) => x.asJSON());
        } catch (ex) {
            return {};
        }
    }

    write() {
        Category.saveAll(this.s3file, this.categories.src);
        Category.saveNews(this.s3file, this.news);
    }
}
