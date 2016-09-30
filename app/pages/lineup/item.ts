import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {AlertController, NavController, NavParams} from "ionic-angular";

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

    }

    editName(spec: Lineup.ItemSpec) {
        this.promptEdit("仕様名の変更", "日本語で入力してください。", spec.info.name, (v) => {
            spec.info.name = v;
        });
    }

    editKey(spec: Lineup.ItemSpec) {
        this.promptEdit("仕様名の変更", "英数字で入力してください。", spec.info.key, (v) => {
            spec.info.key = v;
        });
    }

    private promptEdit(title: string, msg: string, value: string, proc: (v: string) => void) {
        this.alertCtrl.create({
            title: title,
            message: msg,
            inputs: [
                {
                    name: "value",
                    placeholder: value
                }
            ],
            buttons: [
                {
                    text: "Cancel",
                    handler: (data) => { }
                },
                {
                    text: "Save",
                    handler: (data) => {
                        const v = data["value"];
                        if (!_.isEmpty(v)) proc(v);
                    }
                }
            ]
        }).present();
    }
}
