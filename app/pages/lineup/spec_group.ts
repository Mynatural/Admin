import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {SpecPage} from "./spec";
import {Prompt} from "../../providers/util_prompt";
import {SpecGroup, Spec} from "../../providers/model/lineup/spec";
import {Logger} from "../../util/logging";

const logger = new Logger("SpecGroupPage");

@Component({
    templateUrl: 'build/pages/lineup/spec_group.html'
})
export class SpecGroupPage {
    specGroup: SpecGroup;
    sides = ["FRONT", "BACK"];

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.specGroup = params.get("specGroup");
    }

    get title(): string {
        return this.specGroup.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
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

    addNew() {
        this.open(this.specGroup.createNew());
    }
}
