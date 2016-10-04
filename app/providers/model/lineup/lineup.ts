import {Injectable} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./_info.d";
import * as Observ from "./_observ";
import {ItemSpec, ItemSpecValue} from "./spec";
import {ItemMeasure} from "./measure";
import {S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup");

@Injectable()
export class LineupController {
    illust: Observ.Illustration;
    lineup: Promise<Lineup>;

    constructor(private s3image: S3Image) {
        this.illust = new Observ.Illustration(s3image);
        this.lineup = this.getAll().then((list) => {
            return new Lineup(this.illust, list);
        });
    }

    private async getAll(): Promise<LineupValue[]> {
        const rootDir = `${Observ.ROOT}/${Observ.LINEUP}/`
        const finds = await this.s3image.s3.list(rootDir);
        logger.debug(() => `Finds: ${JSON.stringify(finds, null, 4)}`);
        const keys = _.filter(finds.map((path) => {
            if (path.endsWith(`/${Observ.INFO_JSON}`)) {
                const l = _.split(path, "/");
                return l[l.length - 2];
            }
            return null;
        }));
        logger.debug(() => `Keys: ${JSON.stringify(keys, null, 4)}`);
        const list = keys.map(async (key) => {
            try {
                return await this.load(key);
            } catch (ex) {
                logger.warn(() => `Failed to load '${key}': ${ex}`);
                return null;
            }
        });
        return _.filter(await Promise.all(list));
    }

    private async load(key: string): Promise<LineupValue> {
        const text = await this.s3image.s3.read(`${Observ.ROOT}/${Observ.LINEUP}/${key}/${Observ.INFO_JSON}`);
        const info = Base64.decodeJson(text) as Info.LineupValue;
        return new LineupValue(this.illust, key, info);
    }
}

export class Lineup {
    constructor(private illust: Observ.Illustration, public availables: LineupValue[]) { }

    get(key: string): LineupValue {
        return _.find(this.availables, {"key": key});
    }

    async remove(o: LineupValue): Promise<void> {
        await this.illust.onRemoving.itemValue(o, async () => {
            _.remove(this.availables, (a) => _.isEqual(a.key, o.key));
        })
    }

    createNew(): LineupValue {
        const key = Observ.createNewKey("new_created", (key) => _.find(this.availables, {"key": key}));
        const one = new LineupValue(this.illust, key, {
            name: "新しいラインナップ",
            price: 500,
            description: "",
            specs: [],
            specValues: [],
            measurements: []
        });
        this.availables.unshift(one);
        return one;
    }
}

export class LineupValue {
    specs: ItemSpec[];
    measurements: ItemMeasure[];
    private _titleImage: CachedImage;
    private _images: {[key: string]: CachedImage}; // SpecSide -> CachedImage
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private illust: Observ.Illustration, private _key: string, public info: Info.LineupValue) {
        logger.info(() => `${_key}: ${JSON.stringify(info, null, 4)}`);
        this.specs = _.map(info.specs, (spec) => new ItemSpec(illust, this, spec));
        this.measurements = _.map(info.measurements, (m) => new ItemMeasure(illust, this, m));
    }

    refreshIllustrations() {
        this.refreshTiteImage(true);
        this.refreshCurrentImages(true);
    }

    onChangeSpecValue() {
        this.refreshCurrentImages(true);
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.illust.onChanging.itemValueKey(this, async () => {
                logger.debug(() => `Changing lineup key: ${this._key} -> ${v}`);
                this._key = v;
            });
        });
    }

    private refreshTiteImage(clear = false): CachedImage {
        if (clear || _.isNil(this._titleImage)) {
            this._titleImage = this.illust.itemTitle(this);
        }
        return this._titleImage;
    }

    get titleImage(): SafeUrl {
        return this.refreshTiteImage().url;
    }

    async changeImage(file: File): Promise<void> {
        if (file) {
            const path = this.refreshTiteImage().listPath[0];
            await this.illust.s3image.s3.upload(path, file);
            this.refreshTiteImage(true);
        }
    }

    private refreshCurrentImages(clear = false): {[key: string]: CachedImage} {
        if (clear || _.isEmpty(this._images)) {
            this._images = this.illust.itemValueCurrent(this);
        }
        return this._images;
    }

    getImage(side: Info.SpecSide): SafeUrl {
        const safe = this.refreshCurrentImages()[side];
        return safe ? safe.url : null;
    }

    get totalPrice(): number {
        var result = this.info.price;
        _.forEach(this.specs, (spec, key) => {
            const v = spec.current;
            if (v) {
                result = result + v.info.price;
            }
        });
        return result;
    }

    async writeInfo(): Promise<void> {
        const path = `${Observ.dirItem(this)}/${Observ.INFO_JSON}`;
        await this.illust.s3image.s3.write(path, Base64.encodeJson(this.info));
    }

    getSpec(key: string): ItemSpec {
        return _.find(this.specs, (s) => _.isEqual(s.info.key, key));
    }

    async removeSpec(o: ItemSpec): Promise<void> {
        await this.illust.onRemoving.spec(o, async () => {
            _.remove(this.specs, (a) => _.isEqual(a.info.key, o.info.key));
            _.remove(this.info.specs, (a) => _.isEqual(a.key, o.info.key));
        });
    }

    createSpec(): ItemSpec {
        const key = Observ.createNewKey("new_spec", (key) => this.getSpec(key));
        const one = new ItemSpec(this.illust, this, {
            name: "新しい仕様",
            key: key,
            side: "FRONT",
            value: {
                initial: "",
                availables: []
            }
        });
        const initial = one.createNew();
        one.info.value.initial = initial.info.key;
        this.specs.unshift(one);
        this.info.specs.unshift(one.info);
        return one;
    }
}
