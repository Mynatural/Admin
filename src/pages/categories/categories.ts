import _ from "lodash";
import Im from "immutable";

import { Component } from "@angular/core";
import { NavController } from "ionic-angular";

import Info from "../../providers/model/lineup/_info.d";
import { Category, CategoryController } from "../../providers/model/lineup/category";
import { EditableMap } from "../../providers/util/editable_map";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("CategoriesPage");

const emptyCategory = () => {
    return {
        title: "新カテゴリー",
        message: "",
        flags: {}
    };
};

async function editableMap(prom: Promise<Im.Map<string, Category>>): Promise<EditableMap<Info.Category>> {
    async function load() {
        try {
            const map = await prom;
            return _.mapValues(map.toObject(), (x) => x.asJSON());
        } catch (ex) {
            logger.info(() => `No Categories found. Using empty list...`);
            return {};
        }
    }
    const src = await load();
    return new EditableMap<Info.Category>(src, emptyCategory);
}

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
    genders: EditableMap<Info.Category>;

    constructor(private nav: NavController, private ctgCtrl: CategoryController) {
        editableMap(this.ctgCtrl.loadAll()).then((v) => {
            this.categories = v;
        });
        editableMap(this.ctgCtrl.loadGenders()).then((v) => {
            this.genders = v;
        });
        this.loadNews().then((obj) => {
            this.news = obj;
        });
    }

    private async loadNews(): Promise<Info.Category> {
        try {
            const v = await this.ctgCtrl.loadNews();
            return v.asJSON();
        } catch (ex) {
            return emptyCategory();
        }
    }

    write() {
        this.ctgCtrl.saveGenders(this.genders.src);
        this.ctgCtrl.saveAll(this.categories.src);
        this.ctgCtrl.saveNews(this.news);
    }
}
