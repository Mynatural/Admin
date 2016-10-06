import {Injectable} from "@angular/core";
import {AlertController} from "ionic-angular";

@Injectable()
export class Prompt {
    constructor(private alertCtrl: AlertController) { }

    alert(msg: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.alertCtrl.create({
                title: msg,
                buttons: [
                    {
                        text: "OK",
                        role: "cancel",
                        handler: resolve
                    }
                ]
            }).present();
        });
    }

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

    file(title: string, msg?: string): Promise<File> {
        return new Promise<File>((resolve, reject) => {
            this.alertCtrl.create({
                title: title,
                message: msg,
                inputs: [
                    {
                        type: 'file',
                        name: 'file'
                    }
                ],
                buttons: [
                    {
                        text: 'Cancel',
                        handler: (data) => {
                            resolve(null);
                        }
                    },
                    {
                        text: 'Ok',
                        handler: async (data) => {
                            try {
                                const elm = document.querySelector("ion-alert input.alert-input[type='file']") as HTMLInputElement;
                                if (elm && elm.files.length > 0) {
                                    resolve(elm.files[0]);
                                }
                            } catch (ex) {
                                reject(ex);
                            }
                        }
                    }
                ]
            }).present();
        });
    }
}