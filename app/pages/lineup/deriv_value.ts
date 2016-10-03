import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {Prompt} from "../../providers/util_prompt";
import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("DerivValuePage");

@Component({
    templateUrl: 'build/pages/lineup/deriv_value.html'
})
export class DerivValuePage {
    derivValue: Lineup.ItemSpecDerivValue;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.derivValue = params.get("derivValue");
    }

    get title(): string {
        return this.derivValue.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
            await this.derivValue.deriv.remove(this.derivValue);
            this.nav.pop();
        }
    }
}
