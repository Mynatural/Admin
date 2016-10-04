import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {NavController, NavParams} from "ionic-angular";

import {DerivPage} from "./deriv";
import {Prompt} from "../../providers/util_prompt";
import {DerivGroup, Deriv} from "../../providers/model/lineup/deriv";
import {Logger} from "../../util/logging";

const logger = new Logger("DerivGroupPage");

@Component({
    templateUrl: 'build/pages/lineup/deriv_group.html'
})
export class DerivGroupPage {
    derivGroup: DerivGroup;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.derivGroup = params.get("derivGroup");
    }

    get title(): string {
        return this.derivGroup.info.name;
    }

    get isReady(): boolean {
        return !_.isNil(this.title);
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
            await this.derivGroup.spec.removeDeriv(this.derivGroup);
            this.nav.pop();
        }
    }

    open(v: Deriv) {
        this.nav.push(DerivPage, {
            deriv: v
        });
    }

    addNew() {
        this.open(this.derivGroup.createNew());
    }
}
