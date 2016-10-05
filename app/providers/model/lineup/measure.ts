import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./_info.d";
import {LineupController} from "./lineup";
import {Item} from "./item";
import {CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup.Measure");

export class Measure {
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);
    private _image: CachedImage;
    current: number;

    constructor(private ctrl: LineupController, public item: Item, public info: Info.Measurement) {
        this.current = info.value.initial;
    }

    get key(): string {
        return this.info.key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.ctrl.onChanging.measureKey(this, async () => {
                this.info.key = v;
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

    get range(): number[] {
        return _.range(this.info.value.min, this.info.value.max + this.info.value.step, this.info.value.step);
    }
}
