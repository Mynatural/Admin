import {Injectable} from "@angular/core";

import * as Info from "./_info.d";
import {ItemGroup, Item} from "./item";
import {SpecGroup, Spec} from "./spec";
import {DerivGroup, Deriv} from "./deriv";
import {ItemMeasure} from "./measure";

import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup");

const ROOT = "unauthorized";
const LINEUP = "lineup";
const SPEC_VALUE = "spec-value";
const INFO_JSON = "info.json.encoded";

const SIDES = ["FRONT", "BACK"];

export function createNewKey(prefix: string, find: (v: string) => any): string {
    var index = 0;
    var key;
    while (_.isNil(key) || !_.isNil(find(key))) {
        key = `${prefix}_${index++}`;
    }
    return key;
}

function itemDir(key: string): string {
    return `${ROOT}/${LINEUP}/${key}`;
}

function dirItem(o: Item): string {
    return itemDir(o.key);
}

@Injectable()
export class LineupController {
    onChanging: OnChanging;
    onRemoving: OnRemoving;
    illust: Illustration;
    itemGroup: Promise<ItemGroup>;

    constructor(private s3image: S3Image) {
        this.onChanging = new OnChanging(s3image.s3);
        this.onRemoving = new OnRemoving(s3image.s3);
        this.illust = new Illustration(s3image);
        this.itemGroup = this.getAll().then((list) => {
            return new ItemGroup(this, list);
        });
    }

    private async getAll(): Promise<Item[]> {
        const rootDir = itemDir("");
        const finds = await this.s3image.s3.list(rootDir);
        logger.debug(() => `Finds: ${JSON.stringify(finds, null, 4)}`);
        const keys = _.filter(finds.map((path) => {
            if (path.endsWith(`/${INFO_JSON}`)) {
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

    private async load(key: string): Promise<Item> {
        const text = await this.s3image.s3.read(`${itemDir(key)}/${INFO_JSON}`);
        const info = Base64.decodeJson(text) as Info.Item;
        return new Item(this, key, info);
    }

    async write(item: Item): Promise<void> {
        const path = `${itemDir(item.key)}/${INFO_JSON}`;
        await this.s3image.s3.write(path, Base64.encodeJson(item.info));
    }
}

function dirSpecRelative(o: Spec): string {
    const keys = _.map(o.derives, (v) => v.current.info.key);
    return `${o.info.key}/${_.join(keys, "/")}`
}

function imagesDerivValue(o: Deriv): string[] {
    const sv = o.derivGroup.spec;
    return _.flatMap([ROOT, dirItem(sv.specGroup.item)], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${SPEC_VALUE}/${sv.specGroup.info.key}/derives/${sv.info.key}/${o.info.key}/illustration.${sux}`));
}

function imagesSpec(o: Spec): string[] {
    return _.flatMap([ROOT, dirItem(o.specGroup.item)], (base) =>
            _.map(["svg", "png"], (sux) => `${base}/${SPEC_VALUE}/${o.specGroup.info.key}/images/${this.dirSpecRelative(o)}/illustration.${sux}`));
}

class Illustration {
    constructor(private s3image: S3Image) { }

    itemTitle(o: Item): CachedImage {
        return this.s3image.createCache([`${dirItem(o)}/title.png`]);
    }

    async uploadItemTitle(o: Item, file: File): Promise<void> {
        if (file) {
            const path = `${dirItem(o)}/title.png`;
            await this.s3image.s3.upload(path, file);
        }
    }

    // SpecSide -> CachedImage
    itemValueCurrent(o: Item): {[key: string]: CachedImage} {
        const names = _.map(o.specGroups, (specGroup) => dirSpecRelative(specGroup.current));
        const dir = `${dirItem(o)}/images/${_.join(names, "/")}/`;
        return _.fromPairs(_.map(SIDES, (side) =>
            [side, this.s3image.createCache([`${dir}/${side}.png`])]
        ));
    }

    measure(o: ItemMeasure): CachedImage {
        const list = _.map(["svg", "png"], (sux) => `${dirItem(o.item)}/measurements/${o.info.key}/illustration.${sux}`);
        return this.s3image.createCache(list);
    }

    spec(o: Spec): CachedImage {
        const list = imagesSpec(o);
        return this.s3image.createCache(list);
    }

    deriv(o: Deriv): CachedImage {
        const list = imagesDerivValue(o);
        return this.s3image.createCache(list);
    }
}

type DoThru = () => Promise<void>;

function refreshIllustrations(item: Item) {
    item.refreshIllustrations();
    item.measurements.forEach((m) => m.refreshIllustrations());
    item.specGroups.forEach((spec) => {
        spec.availables.forEach((spec) => {
            spec.refreshIllustrations();
            spec.derives.forEach((derivGroup) => {
                derivGroup.availables.forEach((deriv) => {
                    deriv.refreshIllustrations();
                })
            })
        })
    })
}

class OnChanging {
    constructor(private s3: S3File) { }

    async itemKey(o: Item, go: DoThru) {
        const src = dirItem(o);

        await go();

        const dst = dirItem(o);
        await this.s3.moveDir(src, dst);

        refreshIllustrations(o);
    }

    async specGroupKey(o: SpecGroup, go: DoThru) {
        await go();

        refreshIllustrations(o.item);
    }

    async specKey(o: Spec, go: DoThru) {
        await go();

        refreshIllustrations(o.specGroup.item);
    }

    async derivGroupKey(o: DerivGroup, go: DoThru) {
        await go();

        refreshIllustrations(o.spec.specGroup.item);
    }

    async derivKey(o: Deriv, go: DoThru) {
        const srcList = imagesDerivValue(o);

        await go();

        const dstList = imagesDerivValue(o);
        await Promise.all(_.map(_.zip(srcList, dstList),
            (pair) => this.s3.move(pair[0], pair[1])
        ));

        refreshIllustrations(o.derivGroup.spec.specGroup.item);
    }
}

class OnRemoving {
    constructor(private s3: S3File) { }

    async itemValue(o: Item, go: DoThru) {
        await go();
        await this.s3.removeDir(dirItem(o));
    }

    async specGroup(o: SpecGroup, go: DoThru) {
        await go();

        refreshIllustrations(o.item);
    }

    async spec(o: Spec, go: DoThru) {
        await go();

        refreshIllustrations(o.specGroup.item);
    }

    async derivGroup(o: DerivGroup, go: DoThru) {
        await go();

        refreshIllustrations(o.spec.specGroup.item);
    }

    async deriv(o: Deriv, go: DoThru) {
        await go();

        refreshIllustrations(o.derivGroup.spec.specGroup.item);
    }
}
