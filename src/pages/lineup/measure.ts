import _ from "lodash";
import { Component } from "@angular/core";
import { NavController, NavParams } from "ionic-angular";

import { Prompt } from "../../providers/util/prompt";
import { Measure } from "../../providers/model/lineup/measure";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("MeasurePage");

@Component({
    selector: "lineup-measure-page",
    templateUrl: "measure.html"
})
export class MeasurePage {
    measure: Measure;
    keyError: string;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.measure = params.get("measure");
    }

    get title(): string {
        return this.measure.item.name;
    }

    get path(): string[] {
        return [
            `Item: ${this.measure.item.name}`,
            `Measure: ${this.measure.name}`
        ];
    }

    get key(): string {
        return this.measure.key;
    }

    set key(v: string) {
        try {
            this.measure.key = v;
            this.keyError = null;
        } catch (ex) {
            logger.debug(() => `Failed to update key: ${ex}`);
            this.keyError = `${ex}`;
        }
    }

    async write(): Promise<void> {
        await this.measure.item.writeInfo();
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.measure.name}"を削除します`)) {
            await this.measure.item.removeMeasure(this.measure);
            this.nav.pop();
        }
    }

    async uploadImage() {
        try {
            const file = await this.prompt.file("Illustration", "PNG/SVG file");
            if (!_.isNil(file)) {
                await this.prompt.loading("Uploading...", async () => {
                    await this.measure.changeImage(file);
                });
            }
        } catch (ex) {
            logger.warn(() => `Failed to load image: ${ex}`);
        }
    }
}
