import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {DerivGroupPage} from "./deriv_group";
import {Prompt} from "../../providers/util_prompt";
import {Spec} from "../../providers/model/lineup/spec";
import {DerivGroup} from "../../providers/model/lineup/deriv";
import {Logger} from "../../util/logging";

const logger = new Logger("SpecPage");

@Component({
    templateUrl: 'build/pages/lineup/spec.html'
})
export class SpecPage {
    spec: Spec;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.spec = params.get("spec");
    }

    get title(): string {
        return this.spec.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    async delete(): Promise<void> {
        if (_.size(this.spec.specGroup.availables) > 1) {
            if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
                await this.spec.specGroup.remove(this.spec);
                this.nav.pop();
            }
        } else {
            await this.prompt.alert("最後の１つなので削除できません");
        }
    }

    open(v: DerivGroup) {
        this.nav.push(DerivGroupPage, {
            derivGroup: v
        });
    }

    async addNew() {
        this.open(await this.spec.createDeriv());
    }

    async uploadImage() {
        try {
            const file = await this.prompt.file("Illustration", "PNG/SVG file");
            if (!_.isNil(file)) {
                await this.prompt.loading("Uploading...", async () => {
                    await this.spec.changeImage(file);
                });
            }
        } catch (ex) {
            logger.warn(() => `Failed to load image: ${ex}`);
        }
    }
}
