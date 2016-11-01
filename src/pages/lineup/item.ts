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
import {Logger} from "../../util/logging";

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
