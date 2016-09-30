import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {AlertController, NavController, NavParams} from "ionic-angular";

import {SpecPage} from "./spec";
import * as Prompt from "./util_prompt";
import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("ItemPage");

@Component({
    templateUrl: 'build/pages/lineup/item.html'
})
export class ItemPage {
    title: string;
    item: Lineup.Item;

    constructor(private alertCtrl: AlertController, private nav: NavController, params: NavParams, private lineup: Lineup.Lineup) {
        this.item = params.get("item");
        this.title = this.item.name;
    }

    get isReady(): boolean {
        return true;
    }

    open(spec: Lineup.ItemSpec) {
        this.nav.push(SpecPage, {
            spec: spec
        });
    }

    editName(spec: Lineup.ItemSpec) {
        Prompt.edit(this.alertCtrl, "仕様名の変更", "日本語で入力してください。", spec.info.name, (v) => {
            spec.info.name = v;
        });
    }

    editKey(spec: Lineup.ItemSpec) {
        Prompt.edit(this.alertCtrl, "仕様名の変更", "英数字で入力してください。", spec.info.key, (v) => {
            spec.info.key = v;
        });
    }
}
