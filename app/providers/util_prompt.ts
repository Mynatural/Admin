import {Injectable} from "@angular/core";
import {AlertController} from "ionic-angular";

@Injectable()
export class Prompt {
    constructor(private alertCtrl: AlertController) { }

    confirm(msg: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.alertCtrl.create({
                title: msg,
                buttons: [
                    {
                        text: "Cancel",
                        role: "cancel",
                        handler: () => {
                            resolve(false);
                        }
                    },
                    {
                        text: "Ok",
                        handler: () => {
                            resolve(true);
                        }
                    }
                ]
            }).present();
        });
    }
}