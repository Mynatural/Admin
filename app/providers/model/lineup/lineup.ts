import {Injectable} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';

import * as Info from "./_info.d";
import * as Util from "./_util";
import {ItemSpec, ItemSpecValue} from "./spec";
import {ItemMeasure} from "./measure";
import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup");

@Injectable()
export class LineupController {
    lineup: Promise<Lineup>;

    constructor(private s3: S3File, private s3image: S3Image) {
        this.lineup = this.getAll().then((list) => {
            return new Lineup(s3, this.s3image, list);
        });
    }

    private async getAll(): Promise<LineupValue[]> {
        const rootDir = `${Util.ROOT}/$Util.{LINEUP}/`
        const finds = await this.s3.list(rootDir);
        logger.debug(() => `Finds: ${JSON.stringify(finds, null, 4)}`);
        const keys = _.filter(finds.map((path) => {
            if (path.endsWith(`/${Util.INFO_JSON}`)) {
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
        const text = await this.s3.read(`${Util.ROOT}/${Util.LINEUP}/${key}/${Util.INFO_JSON}`);
        const info = Base64.decodeJson(text) as Info.LineupValue;
        return new LineupValue(this.s3, this.s3image, key, info);
    }
}

export class Lineup {
    constructor(private s3: S3File, private s3image: S3Image, public availables: LineupValue[]) { }

    get(key: string): LineupValue {
        return _.find(this.availables, {"key": key});
    }

    async remove(o: LineupValue): Promise<void> {
        _.remove(this.availables, (a) => _.isEqual(a.key, o.key));
        await this.s3.removeDir(o.dir);
    }

    createNew(): LineupValue {
        const key = Util.createNewKey("new_created", (key) => _.find(this.availables, {"key": key}));
        const one = new LineupValue(this.s3, this.s3image, key, {
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
    private _images: {[key: string]: CachedImage} = {};
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private s3: S3File, private s3image: S3Image, private _key: string, public info: Info.LineupValue) {
        logger.info(() => `${_key}: ${JSON.stringify(info, null, 4)}`);
        this.specs = _.map(info.specs, (spec) => new ItemSpec(s3image, this, spec));
        this.measurements = _.map(info.measurements, (m) => new ItemMeasure(s3image, this, m));
    }

    onChangingKey(permit: (v: boolean) => Promise<void>) {

    }

    onChangeSpecValue() {
        this._images = {};
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            logger.debug(() => `Changing lineup key: ${this._key} -> ${v}`);
            const src = this.dir;
            this._key = v;
            await this.s3.moveDir(src, this.dir);
        });
    }

    get dir(): string {
        return `${Util.ROOT}/${Util.LINEUP}/${this.key}`
    }

    get titleImage(): SafeUrl {
        if (_.isNil(this._titleImage)) {
            this._titleImage = this.s3image.createCache([`${this.dir}/title.png`]);
        }
        return this._titleImage.url;
    }

    async changeImage(file: File): Promise<void> {
        if (file) {
            await this.s3.upload(`${this.dir}/title.png`, file);
            this._titleImage = null;
        }
    }

    private refreshImages(): {[key: string]: CachedImage} {
        if (_.isEmpty(this._images)) {
            const names = _.map(this.specs, (spec) => spec.current.dir);
            const dir = `${this.dir}/images/${_.join(names, "/")}/`;
            const list = ["FRONT", "BACK"];
            _.forEach(list, (side) => {
                const path = `${dir}/${side}.png`;
                this._images[side] = this.s3image.createCache([path]);
            });
        }
        return this._images;
    }

    getImage(side: Info.SpecSide): SafeUrl {
        const safe = this.refreshImages()[side];
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
        const path = `${this.dir}/${Util.INFO_JSON}`;
        await this.s3.write(path, Base64.encodeJson(this.info));
    }

    getSpec(key: string): ItemSpec {
        return _.find(this.specs, (s) => _.isEqual(s.info.key, key));
    }

    removeSpec(o: ItemSpec) {
        _.remove(this.specs, (a) => _.isEqual(a.info.key, o.info.key));
        _.remove(this.info.specs, (a) => _.isEqual(a.key, o.info.key));
    }

    createSpec(): ItemSpec {
        const key = Util.createNewKey("new_spec", (key) => this.getSpec(key));
        const one = new ItemSpec(this.s3image, this, {
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
