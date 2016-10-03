import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./_info.d";
import * as Util from "./_util";
import {LineupValue} from "./lineup";
import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("ItemMeasure");

export class ItemMeasure {
    private _image: CachedImage;
    current: number;

    constructor(private s3image: S3Image, public item: LineupValue, public info: Info.Measurement) {
        this.current = info.value.initial;
    }

    get image(): SafeUrl {
        if (_.isNil(this._image)) {
            const list = _.map(["svg", "png"], (sux) => `${this.item.dir}/measurements/${this.info.key}/illustration.${sux}`);
            this._image = this.s3image.createCache(list);
        }
        return this._image.url;
    }

    get range(): number[] {
        return _.range(this.info.value.min, this.info.value.max + this.info.value.step, this.info.value.step);
    }
}
