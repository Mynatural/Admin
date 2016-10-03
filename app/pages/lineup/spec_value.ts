import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {DerivPage} from "./deriv";
import {Prompt} from "../../providers/util_prompt";
import {ItemSpecValue} from "../../providers/model/lineup/spec";
import {ItemSpecDeriv} from "../../providers/model/lineup/deriv";
import {Logger} from "../../util/logging";

const logger = new Logger("SpecValuePage");

@Component({
    templateUrl: 'build/pages/lineup/spec_value.html'
})
export class SpecValuePage {
    specValue: ItemSpecValue;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.specValue = params.get("specValue");
    }

    get title(): string {
        return this.specValue.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
            await this.specValue.spec.remove(this.specValue);
            this.nav.pop();
        }
    }

    open(v: ItemSpecDeriv) {
        this.nav.push(DerivPage, {
            deriv: v
        });
    }

    addNew() {
        this.open(this.specValue.createDeriv());
    }
}
