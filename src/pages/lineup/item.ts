import _ from "lodash";
import {Component} from "@angular/core";
import {NavController, NavParams} from "ionic-angular";

import {SpecGroupPage} from "./spec_group";
import {MeasurePage} from "./measure";
import {Prompt} from "../../providers/util/prompt";

import * as Info from "../../providers/model/lineup/_info";
import {SPEC_SIDES} from "../../providers/model/lineup/lineup";
import {Item} from "../../providers/model/lineup/item";
import {SpecGroup} from "../../providers/model/lineup/spec";
import {Measure} from "../../providers/model/lineup/measure";
import {Logger} from "../../providers/util/logging";

const logger = new Logger("ItemPage");

@Component({
    templateUrl: 'item.html'
})
export class ItemPage {
    item: Item;
    sides = SPEC_SIDES.toArray();
    keyError: string;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.item = params.get("item");
    }

    get title(): string {
        return this.item.name;
    }

    get path(): string[] {
        return [
            `Item: ${this.item.name}`
        ];
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    get key(): string {
        return this.item.key;
    }

    set key(v: string) {
        try {
            this.item.key = v;
            this.keyError = null;
        } catch (ex) {
            logger.debug(() => `Failed to update key: ${ex}`);
            this.keyError = `${ex}`;
        }
    }

    private _flags: ItemFlags;
    get flags(): ItemFlags {
        if (_.isNil(this._flags)) {
            this._flags = new ItemFlags(this.item.flags);
        }
        return this._flags;
    }

    async uploadTitleImage() {
        try {
            const file = await this.prompt.file("Title Image", "PNG file");
            if (!_.isNil(file)) {
                await this.prompt.loading("Uploading...", async () => {
                    await this.item.changeTitleImage(file);
                })
            }
        } catch (ex) {
            logger.warn(() => `Failed to load image: ${ex}`);
        }
    }

    async uploadImage(side: Info.SpecSide) {
        try {
            const file = await this.prompt.file("Image", "PNG file");
            if (!_.isNil(file)) {
                await this.prompt.loading("Uploading...", async () => {
                    await this.item.changeImage(side, file);
                });
            }
        } catch (ex) {
            logger.warn(() => `Failed to load image: ${ex}`);
        }
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
            await this.item.itemGroup.remove(this.item);
            this.nav.pop();
        }
    }

    openSpec(specGroup: SpecGroup) {
        this.nav.push(SpecGroupPage, {
            specGroup: specGroup
        });
    }

    async addNewSpec() {
        this.openSpec(await this.item.createSpec());
    }

    openMeasure(measure: Measure) {
        this.nav.push(MeasurePage, {
            measure: measure
        });
    }

    async addNewMeasure() {
        this.openMeasure(await this.item.createMeasure());
    }
}

export class ItemFlags {
    constructor(private src: {[key: string]: string}) {
        this.list = _.map(src, (v, k) => new ItemFlag(src, k));
    }

    list: ItemFlag[];

    add() {
        const prefix = "new_flag";
        var index = 0;
        const mkName = () => index > 0 ? `${prefix}-${index}` : prefix;
        while (_.has(this.src, mkName())) {
            index++;
        }
        const flag = new ItemFlag(this.src, mkName());
        flag.value = "new_value";
        this.list.push(flag);
    }

    remove(flag: ItemFlag) {
        delete this.src[flag.name];
        _.remove(this.list, (a) => _.isEqual(a.name, flag.name));
    }
}

export class ItemFlag {
    constructor(private src: {[key: string]: string}, private _name: string) {
    }

    get name(): string {
        return this._name;
    }

    set name(v: string) {
        if (_.isEmpty(v)) {
            logger.debug(() => `This key is empty.`);
        } else if (_.has(this.src, v)) {
            logger.debug(() => `This key is duplicate: ${v}`);
        } else {
            const value = this.value;
            delete this.src[this._name];
            this._name = v;
            this.value = value;
        }
    }

    get value(): string {
        return this.src[this._name];
    }

    set value(v: string) {
        this.src[this._name] = v;
    }
}
