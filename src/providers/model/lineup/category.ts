import _ from "lodash";
import Im from "immutable";

import { Injectable } from "@angular/core";

import Info from "./_info.d";
import { ROOT, LINEUP, LineupController } from "./lineup";
import { ItemGroup, Item } from "./item";
import { S3File } from "../../aws/s3file";
import { Logger } from "../../util/logging";
import * as Base64 from "../../util/base64";

const logger = new Logger("Lineup.Category");

const newsJson = "category-news.jsoned";
const generalsJson = "category-generals.jsoned";
const gendersJson = "category-genders.jsoned";

function pathJson(key: string): string {
    return _.join([ROOT, LINEUP, key], "/");
}

@Injectable()
export class CategoryController {
    constructor(private s3file: S3File, private lineup: LineupController) { }

    private _srcList: Promise<Im.List<Item>>;

    get srcList(): Promise<Im.List<Item>> {
        if (_.isNil(this._srcList)) {
            this._srcList = ItemGroup.byAll(this.lineup).then((g) => Im.List(g.availables));
        }
        return this._srcList;
    }

    private async load(key: string): Promise<any> {
        const path = pathJson(key);
        const text = await this.s3file.read(path);
        return Base64.decodeJson(text);
    }

    private async save(key: string, obj: any): Promise<void> {
        const path = pathJson(key);
        const text = Base64.encodeJson(obj);
        await this.s3file.write(path, text);
    }

    async byMap(json: Info.Categories): Promise<Im.Map<string, Category>> {
        const srcList = await this.srcList;
        const map = _.mapValues(json, (v) => new Category(this, v, srcList));
        return Im.Map(map);
    }

    async loadNews(): Promise<Category> {
        const v = (await this.load(newsJson)) as Info.Category;
        return new Category(this, v, await this.srcList);
    }

    async loadGenerals(): Promise<Im.Map<string, Category>> {
        const json = await this.load(generalsJson);
        return this.byMap(json as Info.Categories);
    }

    async loadGenders(): Promise<Im.Map<string, Category>> {
        const json = await this.load(gendersJson);
        return this.byMap(json as Info.Categories);
    }

    async saveNews(obj: Info.Category): Promise<void> {
        await this.save(newsJson, obj);
    }

    async saveGenerals(obj: Info.Categories): Promise<void> {
        await this.save(generalsJson, obj);
    }

    async saveGenders(obj: Info.Categories): Promise<void> {
        await this.save(gendersJson, obj);
    }
}

export class Category {
    constructor(
        private ctrl: CategoryController,
        private json: Info.Category,
        private _srcList?: Im.List<Item>
    ) {
        this._flags = Im.Map(json.flags);
    }

    asJSON(): Info.Category {
        return {
            title: this.title,
            message: this.message,
            flags: this.flags.toObject()
        }
    }

    private _flags: Im.Map<string, string>;

    get title(): string {
        return this.json.title;
    }
    get message(): string {
        return this.json.message;
    }
    get flags(): Im.Map<string, string> {
        return this._flags;
    }

    private _filtering: Promise<Im.List<Item>>;
    private _items: Im.List<Item>;

    get items(): Im.List<Item> {
        if (_.isNil(this._filtering)) {
            this._filtering = this.filter();
            this._filtering.then((v) => {
                this._items = v;
            });
        }
        return this._items;
    }

    private async filter(): Promise<Im.List<Item>> {
        const srcList = this._srcList || await this.ctrl.srcList;
        let result = srcList;
        this.flags.forEach((value, name) => {
            result = result.filter((item) => {
                return _.isEqual(item.flags[name], value);
            }).toList();
        });
        logger.debug(() => `Filtered items: ${srcList.size} -> ${result.size}`);
        return result;
    }
}
