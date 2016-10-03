import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {SpecValuePage} from "./spec_value";
import {Prompt} from "../../providers/util_prompt";
import {ItemSpec, ItemSpecValue} from "../../providers/model/lineup/spec";
import {Logger} from "../../util/logging";

const logger = new Logger("DerivPage");

@Component({
    templateUrl: 'build/pages/lineup/spec.html'
})
export class SpecPage {
    spec: ItemSpec;
    sides = ["FRONT", "BACK"];

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
        if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
            await this.spec.item.removeSpec(this.spec);
            this.nav.pop();
        }
    }

    open(sv: ItemSpecValue) {
        this.nav.push(SpecValuePage, {
            specValue: sv
        });
    }

    addNew() {
        this.open(this.spec.createNew());
    }
}
