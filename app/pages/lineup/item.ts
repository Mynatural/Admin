import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {SpecGroupPage} from "./spec_group";
import {MeasurePage} from "./measure";
import {Prompt} from "../../providers/util_prompt";

import * as Info from "../../providers/model/lineup/_info";
import {LineupController} from "../../providers/model/lineup/lineup";
import {Item} from "../../providers/model/lineup/item";
import {SpecGroup} from "../../providers/model/lineup/spec";
import {Measure} from "../../providers/model/lineup/measure";
import {Logger} from "../../util/logging";

const logger = new Logger("ItemPage");

@Component({
    templateUrl: 'build/pages/lineup/item.html'
})
export class ItemPage {
    item: Item;
    sides = ["FRONT", "BACK"];

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams, private lineupCtrl: LineupController) {
        this.item = params.get("item");
    }

    get title(): string {
        return this.item.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
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
            const itemGroup = await this.lineupCtrl.itemGroup;
            await itemGroup.remove(this.item);
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
