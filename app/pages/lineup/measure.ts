import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {Prompt} from "../../providers/util_prompt";
import {Measure} from "../../providers/model/lineup/measure";
import {Logger} from "../../util/logging";

const logger = new Logger("MeasurePage");

@Component({
    templateUrl: 'build/pages/lineup/measure.html'
})
export class MeasurePage {
    measure: Measure;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.measure = params.get("measure");
    }

    get title(): string {
        return this.measure.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
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
