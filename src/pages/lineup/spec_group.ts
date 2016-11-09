import _ from "lodash";
import { Component } from "@angular/core";
import { NavController, NavParams } from "ionic-angular";

import { SpecPage } from "./spec";
import { Prompt } from "../../providers/util/prompt";
import { SPEC_SIDES } from "../../providers/model/lineup/lineup";
import { SpecGroup, Spec } from "../../providers/model/lineup/spec";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("SpecGroupPage");

@Component({
    templateUrl: 'spec_group.html'
})
export class SpecGroupPage {
    specGroup: SpecGroup;
    sides = SPEC_SIDES.toArray();
    keyError: string;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.specGroup = params.get("specGroup");
    }

    get title(): string {
        return this.specGroup.name;
    }

    get path(): string[] {
        return [
            `Item: ${this.specGroup.item.name}`,
            `Spec: ${this.specGroup.name}`
        ];
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    get key(): string {
        return this.specGroup.key;
    }

    set key(v: string) {
        try {
            this.specGroup.key = v;
            this.keyError = null;
        } catch (ex) {
            logger.debug(() => `Failed to update key: ${ex}`);
            this.keyError = `${ex}`;
        }
    }

    get otherGroups(): SpecGroup[] {
        return _.filter(this.specGroup.item.specGroups,
            (sg) => !_.isEqual(sg.key, this.specGroup.key));
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
            await this.specGroup.item.removeSpec(this.specGroup);
            this.nav.pop();
        }
    }

    open(sv: Spec) {
        this.nav.push(SpecPage, {
            spec: sv
        });
    }

    async addNew() {
        this.open(await this.specGroup.createNew());
    }
}
