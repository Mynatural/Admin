import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import * as Prompt from "./util_prompt";
import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("DerivValuePage");

@Component({
    templateUrl: 'build/pages/lineup/deriv_value.html'
})
export class DerivValuePage {
    title: string;
    derivValue: Lineup.ItemSpecDerivValue;

    constructor(private nav: NavController, params: NavParams) {
        this.derivValue = params.get("derivValue");
        this.title = this.derivValue.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }
}
