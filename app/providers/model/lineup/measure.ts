import {SafeUrl} from '@angular/platform-browser';

import * as Json from "./_info.d";
import {LineupController} from "./lineup";
import {Item} from "./item";
import {CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup.Measure");

export class Measure {
    static async byJSON(ctrl: LineupController, item: Item, json: Json.Measurement): Promise<Measure> {
        return new Measure(ctrl, item, json.key, json.name, json.description,
            json.value.initial, json.value.min, json.value.max, json.value.step
        );
    }

    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);
    private _image: CachedImage;
    current: number;

    constructor(private ctrl: LineupController,
            public item: Item,
            private _key: string,
            public name: string,
            public description: string,
            public initial: number,
            public min: number,
            public max: number,
            public step: number
    ) { }

    get asJSON() {
        return {
            key: this.key,
            name: this.name,
            description: this.description,
            value: {
                initial: this.initial,
                min: this.min,
                max: this.max,
                step: this.step
            }
        };
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        this.ctrl.checkKey(v);
        if (!_.isEqual(this.key, v) && !_.isNil(this.item.getMeasure(v))) throw "Exist key";

        this._changeKey.update(v, async (v) => {
            await this.ctrl.onChanging.measureKey(this, async () => {
                this._key = v;
            });
        });
    }

    refreshIllustrations() {
        this.refreshImage(true);
    }

    refreshImage(clear = false): CachedImage {
        if (clear || _.isNil(this._image)) {
            this._image = this.ctrl.illust.measure(this);
        }
        return this._image;
    }

    async changeImage(file: File): Promise<void> {
        await this.ctrl.illust.uploadMeasure(this, file);
        this.refreshImage(true);
    }

    get image(): SafeUrl {
        return this.refreshImage().url;
    }

    get imagePath(): string[] {
        return this.refreshImage().listPath;
    }

    get range(): number[] {
        return _.range(this.min, this.max + this.step, this.step);
    }
}
