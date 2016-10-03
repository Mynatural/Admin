import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {DerivPage} from "./deriv";
import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("SpecValuePage");

@Component({
    templateUrl: 'build/pages/lineup/spec_value.html'
})
export class SpecValuePage {
    specValue: Lineup.ItemSpecValue;

    constructor(private nav: NavController, params: NavParams) {
        this.specValue = params.get("specValue");
    }

    get title(): string {
        return this.specValue.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    async delete(): Promise<void> {
        await this.specValue.spec.remove(this.specValue);
        this.nav.pop();
    }

    async submit(): Promise<void> {
    }

    open(v: Lineup.ItemSpecDeriv) {
        this.nav.push(DerivPage, {
            deriv: v
        });
    }

    addNew() {
        this.open(this.specValue.createDeriv());
    }
}
