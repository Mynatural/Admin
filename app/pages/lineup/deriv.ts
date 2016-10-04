import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {Prompt} from "../../providers/util_prompt";
import {Deriv} from "../../providers/model/lineup/deriv";
import {Logger} from "../../util/logging";

const logger = new Logger("DerivPage");

@Component({
    templateUrl: 'build/pages/lineup/deriv.html'
})
export class DerivPage {
    deriv: Deriv;

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
            await this.deriv.derivGroup.remove(this.deriv);
            this.nav.pop();
        }
    }
}
