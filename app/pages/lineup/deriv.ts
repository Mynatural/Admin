import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {DerivValuePage} from "./deriv_value";
import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("DerivPage");

@Component({
    templateUrl: 'build/pages/lineup/deriv.html'
})
export class DerivPage {
    title: string;
    deriv: Lineup.ItemSpecDeriv;

    constructor(private nav: NavController, params: NavParams) {
        this.deriv = params.get("deriv");
        this.title = this.deriv.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    open(v: Lineup.ItemSpecDerivValue) {
        this.nav.push(DerivValuePage, {
            derivValue: v
        });
    }
}
