import _ from "lodash";
import {Component} from "@angular/core";
import {NavController, NavParams} from "ionic-angular";

import {Prompt} from "../../providers/util/prompt";
import {Deriv} from "../../providers/model/lineup/deriv";
import {Logger} from "../../providers/util/logging";

const logger = new Logger("DerivPage");

@Component({
    templateUrl: 'deriv.html'
})
export class DerivPage {
    deriv: Deriv;
    keyError: string;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.deriv = params.get("deriv");
    }

    get title(): string {
        return this.deriv.name;
    }

    get path(): string[] {
        return [
            `Item: ${this.deriv.derivGroup.spec.specGroup.item.name}`,
            `Spec: ${this.deriv.derivGroup.spec.specGroup.name} > ${this.deriv.derivGroup.spec.name}`,
            `Deriv: ${this.deriv.derivGroup.name} > ${this.deriv.name}`
        ];
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    get key(): string {
        return this.deriv.key;
    }

    set key(v: string) {
        try {
            this.deriv.key = v;
            this.keyError = null;
        } catch (ex) {
            logger.debug(() => `Failed to update key: ${ex}`);
            this.keyError = `${ex}`;
        }
    }

    async delete(): Promise<void> {
        if (_.size(this.deriv.derivGroup.availables) > 1) {
            if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
                await this.deriv.derivGroup.remove(this.deriv);
                this.nav.pop();
            }
        } else {
            await this.prompt.alert("最後の１つなので削除できません");
        }
    }

    async uploadImage() {
        try {
            const file = await this.prompt.file("Illustration", "PNG/SVG file");
            if (!_.isNil(file)) {
                await this.prompt.loading("Uploading...", async () => {
                    await this.deriv.changeImage(file);
                });
            }
        } catch (ex) {
            logger.warn(() => `Failed to load image: ${ex}`);
        }
    }
}
