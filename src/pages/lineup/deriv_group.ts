import { Component } from "@angular/core";
import { NavController, NavParams, reorderArray } from "ionic-angular";

import { DerivPage } from "./deriv";
import { Prompt } from "../../providers/util/prompt";
import { DerivGroup, Deriv } from "../../providers/model/lineup/deriv";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("DerivGroupPage");

@Component({
    selector: "lineup-deriv_group-page",
    templateUrl: "deriv_group.html"
})
export class DerivGroupPage {
    derivGroup: DerivGroup;
    keyError: string;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.derivGroup = params.get("derivGroup");
    }

    get title(): string {
        return this.derivGroup.spec.specGroup.item.name;
    }

    get path(): string[] {
        return [
            `Item: ${this.derivGroup.spec.specGroup.item.name}`,
            `Spec: ${this.derivGroup.spec.specGroup.name} > ${this.derivGroup.spec.name}`,
            `Deriv: ${this.derivGroup.name}`
        ];
    }

    get key(): string {
        return this.derivGroup.key;
    }

    set key(v: string) {
        try {
            this.derivGroup.key = v;
            this.keyError = null;
        } catch (ex) {
            logger.debug(() => `Failed to update key: ${ex}`);
            this.keyError = `${ex}`;
        }
    }

    async write(): Promise<void> {
        await this.derivGroup.spec.specGroup.item.writeInfo();
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.derivGroup.name}"を削除します`)) {
            await this.derivGroup.spec.removeDeriv(this.derivGroup);
            this.nav.pop();
        }
    }

    open(v: Deriv) {
        this.nav.push(DerivPage, {
            deriv: v
        });
    }

    async addNew() {
        this.open(await this.derivGroup.createNew());
    }

    reorder(indexes) {
        this.derivGroup.availables = reorderArray(this.derivGroup.availables, indexes);
    }
}
