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
