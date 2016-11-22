import _ from "lodash";

import { Component } from "@angular/core";
import { NavController, NavParams } from "ionic-angular";

import Info from "../../../providers/model/lineup/_info";
import { SPEC_SIDES } from "../../../providers/model/lineup/lineup";
import { Item } from "../../../providers/model/lineup/item";
import { Prompt } from "../../../providers/util/prompt";
import { Logger } from "../../../providers/util/logging";

const logger = new Logger("ItemTabImages");

const SIDES = SPEC_SIDES.toArray() as string[];
function isSide(key: string): boolean {
    return 0 <= SIDES.indexOf(key);
}

@Component({
    selector: "item-tab_images",
    templateUrl: 'tab_images.html'
})
export class ItemTabImages {
    readonly item: Item;
    readonly write: () => Promise<void>;

    imageKey = "TITLE";
    imageKeys = [this.imageKey].concat(SIDES);

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.item = params.get("item");
        this.write = params.get("write");
    }

    get title(): string {
        return this.item.name;
    }

    get(key: string) {
        if (isSide(key)) {
            return this.item.getImage(key as Info.SpecSide);
        } else {
            return this.item.titleImage;
        }
    }

    upload(key: string) {
        if (isSide(key)) {
            this.uploadSideImage(key as Info.SpecSide);
        } else {
            this.uploadTitleImage();
        }
    }

    private async uploadTitleImage() {
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

    private async uploadSideImage(side: Info.SpecSide) {
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
}
