import _ from "lodash";

import { Component } from "@angular/core";
import { NavController, NavParams } from "ionic-angular";

import Info from "../../../providers/model/lineup/_info";
import { SPEC_SIDES } from "../../../providers/model/lineup/lineup";
import { Item } from "../../../providers/model/lineup/item";
import { Prompt } from "../../../providers/util/prompt";
import { Logger } from "../../../providers/util/logging";

const logger = new Logger("ItemTabImages");

@Component({
    selector: "item-tab_images",
    templateUrl: 'tab_images.html'
})
export class ItemTabImages {
    readonly item: Item;
    sides = SPEC_SIDES.toArray();

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.item = params.get("item");
    }

    get title(): string {
        return this.item.name;
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
            const file = await this.prompt.file(`${side} Image`, "PNG file");
            if (!_.isNil(file)) {
                await this.prompt.loading("Uploading...", async () => {
                    await this.item.changeImage(side, file);
                });
            }
        } catch (ex) {
            logger.warn(() => `Failed to load image: ${ex}`);
        }
    }

    async write(): Promise<void> {
        await this.item.writeInfo();
    }
}
