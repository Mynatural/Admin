import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {SpecValuePage} from "./spec_value";
import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("DerivPage");

@Component({
    templateUrl: 'build/pages/lineup/spec.html'
})
export class SpecPage {
    title: string;
    spec: Lineup.ItemSpec;
    sides = ["FRONT", "BACK"];

    constructor(private nav: NavController, params: NavParams) {
        this.spec = params.get("spec");
        this.title = this.spec.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    open(sv: Lineup.ItemSpecValue) {
        this.nav.push(SpecValuePage, {
            specValue: sv
        });
    }
}
