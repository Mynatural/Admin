import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {DerivValuePage} from "./deriv_value";
import {Prompt} from "../../providers/util_prompt";
import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("DerivPage");

@Component({
    templateUrl: 'build/pages/lineup/deriv.html'
})
export class DerivPage {
    deriv: Lineup.ItemSpecDeriv;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.deriv = params.get("deriv");
    }

    get title(): string {
        return this.deriv.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
            await this.deriv.specValue.removeDeriv(this.deriv);
            this.nav.pop();
        }
    }

    async submit(): Promise<void> {
    }

    open(v: Lineup.ItemSpecDerivValue) {
        this.nav.push(DerivValuePage, {
            derivValue: v
        });
    }

    addNew() {
        this.open(this.deriv.createNew());
    }
}
