import {AlertController} from "ionic-angular";

export function edit(alertCtrl: AlertController, title: string, msg: string, value: string, proc: (v: string) => void) {
    alertCtrl.create({
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

export function editName(a) {
    edit(this.alertCtrl, "仕様名の変更", "日本語で入力してください。", a.info.name, (v) => {
        a.info.name = v;
    });
}

export function editKey(a) {
    edit(this.alertCtrl, "仕様名の変更", "英数字で入力してください。", a.info.key, (v) => {
        a.info.key = v;
    });
}
