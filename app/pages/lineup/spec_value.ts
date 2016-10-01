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
    title: string;
    specValue: Lineup.ItemSpecValue;

    constructor(private nav: NavController, params: NavParams) {
        this.specValue = params.get("specValue");
        this.title = this.specValue.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    open(v: Lineup.ItemSpecDeriv) {
        this.nav.push(DerivPage, {
            deriv: v
        });
    }
}
