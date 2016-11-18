import _ from "lodash";
import Im from "immutable";

import { Component } from "@angular/core";
import { NavController } from "ionic-angular";

import { CategoriesTabMulti } from "./tab_multi";
import { CategoriesTabSingle } from "./tab_single";
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

export type TabParams<T> = {
    title: string,
    feature: Promise<T>,
    save: (T) => Promise<void>
};

@Component({
    selector: "categories-page",
    templateUrl: 'categories.html'
})
export class CategoriesPage {
    static title = "カテゴリー";
    static icon = "albums";
    readonly title = CategoriesPage.title;

    readonly tabSingle = CategoriesTabSingle;
    readonly tabMulti = CategoriesTabMulti;

    readonly news: TabParams<Info.Category>
    readonly generals: TabParams<EditableMap<Info.Category>>;
    readonly genders: TabParams<EditableMap<Info.Category>>;

    constructor(private nav: NavController, private ctgCtrl: CategoryController) {
        this.generals = {
            title: "Generals",
            feature: editableMap(this.ctgCtrl.loadGenerals()),
            save: (x) => this.ctgCtrl.saveGenerals(x.toObject())
        };
        this.genders = {
            title: "Genders",
            feature: editableMap(this.ctgCtrl.loadGenders()),
            save: (x) => this.ctgCtrl.saveGenders(x.toObject())
        };
        this.news = {
            title: "News",
            feature: this.loadNews(),
            save: (x) => this.ctgCtrl.saveNews(x)
        };
    }

    private async loadNews(): Promise<Info.Category> {
        try {
            const v = await this.ctgCtrl.loadNews();
            return v.asJSON();
        } catch (ex) {
            logger.info(() => `No News Category found. Using default...: ${ex}`);
            return emptyCategory();
        }
    }
}
