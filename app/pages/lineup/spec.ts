import {Component} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';
import {AlertController, NavController, NavParams} from "ionic-angular";

import * as Lineup from "../../providers/model/lineup";
import {Logger} from "../../util/logging";

const logger = new Logger("ItemPage");

@Component({
    templateUrl: 'build/pages/lineup/spec.html'
})
export class SpecPage {
    title: string;
    spec: Lineup.ItemSpec;

    constructor(private alertCtrl: AlertController, private nav: NavController, params: NavParams, private lineup: Lineup.Lineup) {
        this.spec = params.get("spec");
        this.title = this.spec.info.name;
    }

    get isReady(): boolean {
        return true;
    }

    open(v: Lineup.ItemSpecValue) {

    }

    editName(sv: Lineup.ItemSpecValue) {
        this.promptEdit("仕様名の変更", "日本語で入力してください。", sv.info.name, (v) => {
            sv.info.name = v;
        });
    }

    editKey(sv: Lineup.ItemSpecValue) {
        this.promptEdit("仕様名の変更", "英数字で入力してください。", sv.info.key, (v) => {
            sv.info.key = v;
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
