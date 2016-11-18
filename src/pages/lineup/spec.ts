import _ from "lodash";
import { Component } from "@angular/core";
import { NavController, NavParams, reorderArray } from "ionic-angular";

import { DerivGroupPage } from "./deriv_group";
import { Prompt } from "../../providers/util/prompt";
import { Spec } from "../../providers/model/lineup/spec";
import { DerivGroup } from "../../providers/model/lineup/deriv";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("SpecPage");

@Component({
    selector: "lineup-spec-page",
    templateUrl: "spec.html"
})
export class SpecPage {
    spec: Spec;
    keyError: string;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.spec = params.get("spec");
    }

    get title(): string {
        return this.spec.specGroup.item.name;
    }

    get path(): string[] {
        return [
            `Item: ${this.spec.specGroup.item.name}`,
            `Spec: ${this.spec.specGroup.name} > ${this.spec.name}`
        ];
    }

    get key(): string {
        return this.spec.key;
    }

    set key(v: string) {
        try {
            this.spec.key = v;
            this.keyError = null;
        } catch (ex) {
            logger.debug(() => `Failed to update key: ${ex}`);
            this.keyError = `${ex}`;
        }
    }

    async write(): Promise<void> {
        await this.spec.specGroup.item.writeInfo();
    }

    async delete(): Promise<void> {
        if (_.size(this.spec.specGroup.availables) > 1) {
            if (await this.prompt.confirm(`"${this.spec.name}"を削除します`)) {
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

    reorder(indexes) {
        this.spec.derivGroups = reorderArray(this.spec.derivGroups, indexes);
    }
}
