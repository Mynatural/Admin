import {Injectable} from "@angular/core";

import * as Info from "./_info.d";
import {ItemGroup, Item} from "./item";
import {SpecGroup, Spec} from "./spec";
import {DerivGroup, Deriv} from "./deriv";
import {Measure} from "./measure";

import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup");

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

    createNewKey(prefix: string, find: (v: string) => any): string {
        var index = 0;
        var key;
        while (_.isNil(key) || !_.isNil(find(key))) {
            key = `${prefix}_${index++}`;
        }
        return key;
    }

    private async getAll(): Promise<Item[]> {
        const rootDir = Path.itemDir("");
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
        const text = await this.s3image.s3.read(`${Path.itemDir(key)}/${INFO_JSON}`);
        const info = Base64.decodeJson(text) as Info.Item;
        return new Item(this, key, info);
    }

    async write(item: Item): Promise<void> {
        const path = `${Path.itemDir(item.key)}/${INFO_JSON}`;
        await this.s3image.s3.write(path, Base64.encodeJson(item.info));
    }
}

const ROOT = "unauthorized";
const LINEUP = "lineup";
const SPEC = "_spec";
const INFO_JSON = "info.json.encoded";

const SIDES: Info.SpecSide[] = ["FRONT", "BACK"];

class Path {
    static itemDir(key: string): string {
        return `${ROOT}/${LINEUP}/${key}`;
    }

    static dirItem(o: Item): string {
        return Path.itemDir(o.key);
    }

    static imagesItemTitle(o: Item): string[] {
        return [`${Path.dirItem(o)}/title.png`];
    }

    static imagesItem(o: Item, side: Info.SpecSide): string[] {
        const names = _.map(o.specGroups, (specGroup) => Path.dirSpecRelative(specGroup.current));
        const dir = `${Path.dirItem(o)}/images/${_.join(names, "/")}`;
        return [`${dir}/${side}.png`];
    }

    static dirSpecRelative(o: Spec): string {
        const keys = _.map(o.derives, (v) => v.current.info.key);
        keys.unshift(o.info.key);
        return _.join(keys, "/");
    }

    static dirSpec(spec: Spec): string {
        const base = spec.global ? ROOT : Path.dirItem(spec.specGroup.item);
        return `${base}/${SPEC}/${spec.specGroup.info.key}`;
    }

    static illustration(dir: string, sux: string): string {
        return `${dir}/illustration.${sux}`;
    }

    static illustrations(dir: string): string[] {
        return _.map(["svg", "png"], (sux) => Path.illustration(dir, sux));
    }

    static underSpec(spec: Spec, under: string): string[] {
        return Path.illustrations(`${Path.dirSpec(spec)}/${under}`);
    }

    static imagesDeriv(o: Deriv): string[] {
        const spec = o.derivGroup.spec;
        return Path.underSpec(spec, `derives/${spec.info.key}/${o.derivGroup.info.key}/${o.info.key}`);
    }

    static imagesSpec(spec: Spec): string[] {
        return Path.underSpec(spec, `images/${Path.dirSpecRelative(spec)}`);
    }

    static imagesMeasure(o: Measure): string[] {
        return Path.illustrations(`${Path.dirItem(o.item)}/measurements/${o.info.key}`);
    }
}

class Illustration {
    constructor(private s3image: S3Image) { }

    private async upload(pathList: string[], file: File): Promise<void> {
        const sux = file.name.replace(/.*\./, "");
        const path = _.find(pathList, sux);
        if (_.isNil(path)) {
            throw `Illegal file type: ${sux}`;
        }
        await this.s3image.s3.upload(path, file);
    }

    itemTitle(o: Item): CachedImage {
        return this.s3image.createCache(Path.imagesItemTitle(o));
    }

    async uploadItemTitle(o: Item, file: File): Promise<void> {
        await this.upload(Path.imagesItemTitle(o), file);
    }

    // SpecSide -> CachedImage
    itemCurrent(o: Item): {[key: string]: CachedImage} {
        return _.fromPairs(_.map(SIDES, (side) =>
            [side, this.s3image.createCache(Path.imagesItem(o, side))]
        ));
    }

    async uploadItemCurrent(o: Item, side: Info.SpecSide, file: File): Promise<void> {
        await this.upload(Path.imagesItem(o, side), file);
    }

    specCurrent(o: Spec): CachedImage {
        return this.s3image.createCache(Path.imagesSpec(o));
    }

    async uploadSpecCurrent(o: Spec, file: File): Promise<void> {
        await this.upload(Path.imagesSpec(o), file);
    }

    deriv(o: Deriv): CachedImage {
        return this.s3image.createCache(Path.imagesDeriv(o));
    }

    async uploadDeriv(o: Deriv, file: File): Promise<void> {
        await this.upload(Path.imagesDeriv(o), file);
    }

    measure(o: Measure): CachedImage {
        return this.s3image.createCache(Path.imagesMeasure(o));
    }

    async uploadMeasure(o: Measure, file: File): Promise<void> {
        await this.upload(Path.imagesMeasure(o), file);
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

    private async moveFile(src, dst): Promise<void> {
        if (await this.s3.exists(src)) {
            await this.s3.move(src, dst);
        }
    }

    async itemKey(o: Item, go: DoThru) {
        const src = Path.dirItem(o);

        await go();

        const dst = Path.dirItem(o);
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
        const srcList = Path.imagesDeriv(o);

        await go();

        const dstList = Path.imagesDeriv(o);
        await Promise.all(_.map(_.zip(srcList, dstList),
            (pair) => this.moveFile(pair[0], pair[1])
        ));

        refreshIllustrations(o.derivGroup.spec.specGroup.item);
    }
}

class OnRemoving {
    constructor(private s3: S3File) { }

    async itemValue(o: Item, go: DoThru) {
        await go();
        await this.s3.removeDir(Path.dirItem(o));
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
